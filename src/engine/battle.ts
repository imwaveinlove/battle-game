import { elementMultiplier, effectivenessLabel, MULT, polarityMultiplier } from './elements';
import { createRng, type Rng } from './rng';
import type { Skill } from './schema';
import { STATUS_INFO, type Element, type Polarity, type Stats, type StatusId } from './types';

export type Side = 'ally' | 'enemy';
export type BuffStat = 'atk' | 'def' | 'spd';

export interface BattleUnit {
  uid: string;
  side: Side;
  /** 'hero' | 캐릭터 id | 적 템플릿 id */
  refId: string;
  name: string;
  emoji: string;
  element: Element;
  polarity: Polarity;
  level: number;
  max: Stats;
  hp: number;
  mp: number;
  skills: Skill[];
  statuses: { id: StatusId; turns: number }[];
  buffs: { stat: BuffStat; mult: number; turns: number }[];
}

export interface Action {
  actor: string;
  skillId: string;
  target?: string;
}

export type EventKind = 'action' | 'damage' | 'heal' | 'status' | 'buff' | 'faint' | 'skip' | 'info' | 'end';

export interface BattleEvent {
  kind: EventKind;
  text: string;
  actor?: string;
  target?: string;
  amount?: number;
  crit?: boolean;
  mult?: number;
  /** 이벤트 직후 HP/MP 스냅샷 (UI 애니메이션용) */
  hp: Record<string, number>;
  mp: Record<string, number>;
}

export interface BattleState {
  units: BattleUnit[];
  round: number;
  result: 'win' | 'lose' | null;
  seed: number;
}

export const MAX_MP = 100;
export const START_MP = 40;
const CRIT_RATE = 0.06;
const CRIT_MULT = 1.5;
const AOE_MULT = 0.75;
const DOT: Partial<Record<StatusId, number>> = { burn: 0.06, poison: 0.05 };
const STATUS_TURNS: Record<StatusId, number> = { burn: 3, poison: 4, freeze: 1, stun: 1 };

export function basicAttack(element: Element): Skill {
  return {
    id: 'basic',
    name: '기본 공격',
    element,
    kind: 'attack',
    target: 'enemy',
    power: 40,
    cost: 0,
    description: '기력을 쓰지 않는 기본 공격',
  };
}

export function unitSkills(u: BattleUnit): Skill[] {
  return [basicAttack(u.element), ...u.skills];
}

export function findSkill(u: BattleUnit, id: string): Skill | undefined {
  return unitSkills(u).find((s) => s.id === id);
}

export const alive = (u: BattleUnit) => u.hp > 0;
export const opponents = (s: BattleState, u: BattleUnit) => s.units.filter((x) => x.side !== u.side && alive(x));
export const friends = (s: BattleState, u: BattleUnit) => s.units.filter((x) => x.side === u.side && alive(x));

export function effStat(u: BattleUnit, k: keyof Stats): number {
  let v = u.max[k];
  for (const b of u.buffs) if (b.stat === k) v *= b.mult;
  return v;
}

export function createBattle(allies: BattleUnit[], enemies: BattleUnit[], seed = Date.now()): BattleState {
  return { units: [...allies, ...enemies], round: 1, result: null, seed: seed >>> 0 };
}

/** 랜덤/치명 없이 기대 데미지 (AI 평가용) — rng를 주면 실제 판정 */
export function computeDamage(
  actor: BattleUnit,
  target: BattleUnit,
  skill: Skill,
  aoe: boolean,
  rng?: Rng,
): { amount: number; mult: number; crit: boolean } {
  const atk = effStat(actor, 'atk');
  const def = effStat(target, 'def');
  const base = (skill.power / 100) * atk * ((2 * atk) / (atk + def));
  const em = elementMultiplier(skill.element, target.element);
  let m = em * polarityMultiplier(actor.polarity, target.polarity);
  if (skill.element === actor.element) m *= MULT.stab;
  if (aoe) m *= AOE_MULT;
  let crit = false;
  let rand = 0.925;
  if (rng) {
    crit = rng.chance(CRIT_RATE);
    rand = 0.85 + rng.next() * 0.15;
  }
  if (crit) m *= CRIT_MULT;
  return { amount: Math.max(1, Math.round(base * m * rand)), mult: em, crit };
}

export function computeHeal(actor: BattleUnit, skill: Skill): number {
  return Math.max(1, Math.round((skill.power / 100) * effStat(actor, 'qi') * 2.2));
}

/** 시전 대상 확정 (지정 대상이 쓰러졌으면 자동 재지정) */
export function resolveTargets(s: BattleState, actor: BattleUnit, skill: Skill, target?: string, rng?: Rng): BattleUnit[] {
  const opp = opponents(s, actor);
  const fr = friends(s, actor);
  switch (skill.target) {
    case 'enemy': {
      const t = opp.find((u) => u.uid === target);
      if (t) return [t];
      if (!opp.length) return [];
      return [rng ? rng.pick(opp) : opp[0]];
    }
    case 'allEnemies':
      return opp;
    case 'ally': {
      const t = fr.find((u) => u.uid === target);
      if (t) return [t];
      return fr.length ? [fr.reduce((a, b) => (a.hp / a.max.hp <= b.hp / b.max.hp ? a : b))] : [];
    }
    case 'allAllies':
      return fr;
    case 'self':
      return [actor];
  }
}

function addBuff(u: BattleUnit, stat: BuffStat, mult: number, turns: number) {
  // 같은 스탯·같은 방향(버프/디버프)은 덮어쓴다
  u.buffs = u.buffs.filter((b) => !(b.stat === stat && b.mult > 1 === mult > 1));
  u.buffs.push({ stat, mult, turns });
}

export type ChooseAction = (s: BattleState, u: BattleUnit, rng: Rng) => Action;

/**
 * 한 라운드 진행. allyActions 에 없는 아군과 모든 적은 chooseAction(AI)으로 행동한다.
 * 원본 state 는 변경하지 않는다.
 */
export function resolveRound(
  prev: BattleState,
  allyActions: Action[],
  chooseAction: ChooseAction,
): { state: BattleState; events: BattleEvent[] } {
  const s: BattleState = structuredClone(prev);
  if (s.result) return { state: s, events: [] };
  const rng = createRng(s.seed);
  const events: BattleEvent[] = [];
  const byId = new Map(s.units.map((u) => [u.uid, u]));
  const emit = (e: Omit<BattleEvent, 'hp' | 'mp'>) => {
    events.push({
      ...e,
      hp: Object.fromEntries(s.units.map((u) => [u.uid, u.hp])),
      mp: Object.fromEntries(s.units.map((u) => [u.uid, u.mp])),
    });
  };

  // 행동 수집
  const actions = new Map<string, Action>();
  for (const a of allyActions) {
    const u = byId.get(a.actor);
    if (u && u.side === 'ally' && alive(u)) actions.set(u.uid, a);
  }
  for (const u of s.units) {
    if (alive(u) && !actions.has(u.uid)) actions.set(u.uid, chooseAction(s, u, rng));
  }

  // 속도순 (±10% 흔들림)
  const order = s.units
    .filter(alive)
    .map((u) => ({ u, init: effStat(u, 'spd') * (0.9 + rng.next() * 0.2) }))
    .sort((a, b) => b.init - a.init)
    .map((x) => x.u);

  const checkEnd = () => {
    if (!s.units.some((u) => u.side === 'enemy' && alive(u))) s.result = 'win';
    else if (!s.units.some((u) => u.side === 'ally' && alive(u))) s.result = 'lose';
    return s.result !== null;
  };

  const faint = (t: BattleUnit) => {
    if (t.hp <= 0) {
      t.hp = 0;
      t.statuses = [];
      t.buffs = [];
      emit({ kind: 'faint', text: `${t.name}${josa(t.name, '이', '가')} 쓰러졌다!`, target: t.uid });
    }
  };

  for (const actor of order) {
    if (s.result) break;
    if (!alive(actor)) continue;

    const block = actor.statuses.find((x) => x.id === 'freeze' || x.id === 'stun');
    if (block) {
      actor.statuses = actor.statuses.filter((x) => x !== block);
      emit({
        kind: 'skip',
        text: `${actor.name}${josa(actor.name, '은', '는')} ${STATUS_INFO[block.id].ko} 상태라 움직일 수 없다!`,
        actor: actor.uid,
      });
      continue;
    }

    const act = actions.get(actor.uid)!;
    let skill = findSkill(actor, act.skillId) ?? basicAttack(actor.element);
    if (skill.cost > actor.mp) skill = basicAttack(actor.element);
    const targets = resolveTargets(s, actor, skill, act.target, rng);
    if (!targets.length) continue;
    actor.mp -= skill.cost;
    emit({ kind: 'action', text: `${actor.name}의 ${skill.name}!`, actor: actor.uid });

    const aoe = skill.target === 'allEnemies' && targets.length > 1;
    for (const t of targets) {
      if (skill.kind === 'attack') {
        if (!alive(t)) continue;
        const d = computeDamage(actor, t, skill, aoe, rng);
        t.hp = Math.max(0, t.hp - d.amount);
        const label = effectivenessLabel(d.mult);
        emit({
          kind: 'damage',
          text: `${t.name}에게 ${d.amount} 피해${d.crit ? ' (치명타!)' : ''}${label ? ` — ${label}` : ''}`,
          actor: actor.uid,
          target: t.uid,
          amount: d.amount,
          crit: d.crit,
          mult: d.mult,
        });
        if (t.hp <= 0) {
          faint(t);
          continue;
        }
      } else if (skill.kind === 'heal') {
        if (!alive(t)) continue;
        const amt = Math.min(computeHeal(actor, skill), t.max.hp - t.hp);
        t.hp += amt;
        emit({ kind: 'heal', text: `${t.name}의 체력이 ${amt} 회복됐다`, actor: actor.uid, target: t.uid, amount: amt });
      }
      applyEffect(skill, actor, t, rng, emit);
    }
    if (checkEnd()) break;
  }

  // 라운드 종료: 지속 피해, 턴 감소, 기력 회복
  if (!s.result) {
    for (const u of s.units) {
      if (!alive(u)) continue;
      for (const st of u.statuses) {
        const ratio = DOT[st.id];
        if (ratio) {
          const dmg = Math.max(1, Math.round(u.max.hp * ratio));
          u.hp = Math.max(0, u.hp - dmg);
          emit({ kind: 'damage', text: `${u.name}${josa(u.name, '은', '는')} ${STATUS_INFO[st.id].ko}으로 ${dmg} 피해`, target: u.uid, amount: dmg });
        }
      }
      if (u.hp <= 0) {
        faint(u);
        continue;
      }
      u.statuses = u.statuses.map((x) => ({ ...x, turns: x.id in DOT ? x.turns - 1 : x.turns })).filter((x) => x.turns > 0);
      u.buffs = u.buffs.map((b) => ({ ...b, turns: b.turns - 1 })).filter((b) => b.turns > 0);
      u.mp = Math.min(MAX_MP, u.mp + 8 + Math.floor(effStat(u, 'qi') / 10));
    }
    checkEnd();
  }

  if (s.result) {
    emit({ kind: 'end', text: s.result === 'win' ? '승리했다!' : '패배했다…' });
  }

  s.round += 1;
  s.seed = Math.floor(rng.next() * 2 ** 31);
  return { state: s, events };
}

function applyEffect(
  skill: Skill,
  actor: BattleUnit,
  t: BattleUnit,
  rng: Rng,
  emit: (e: Omit<BattleEvent, 'hp' | 'mp'>) => void,
) {
  const eff = skill.effect;
  if (!eff || !alive(t)) return;
  if (eff.status) {
    // 기(氣)가 높을수록 상태이상 확률 소폭 증가
    const chance = Math.min(1, (eff.chance ?? 1) * (1 + effStat(actor, 'qi') / 400));
    if (!t.statuses.some((x) => x.id === eff.status) && rng.chance(chance)) {
      t.statuses.push({ id: eff.status, turns: STATUS_TURNS[eff.status] });
      emit({
        kind: 'status',
        text: `${t.name}${josa(t.name, '은', '는')} ${STATUS_INFO[eff.status].ko} 상태가 됐다! ${STATUS_INFO[eff.status].icon}`,
        target: t.uid,
      });
    }
  }
  if (eff.buff) {
    addBuff(t, eff.buff.stat, eff.buff.mult, eff.buff.turns);
    const up = eff.buff.mult > 1;
    const statKo = { atk: '공격', def: '방어', spd: '속도' }[eff.buff.stat];
    emit({ kind: 'buff', text: `${t.name}의 ${statKo}${josa(statKo, '이', '가')} ${up ? '올랐다 ▲' : '떨어졌다 ▼'}`, target: t.uid });
  }
}

/** 한글 받침에 따른 조사 선택 */
export function josa(word: string, withBatchim: string, without: string): string {
  const ch = word.charCodeAt(word.length - 1);
  if (ch < 0xac00 || ch > 0xd7a3) return without;
  return (ch - 0xac00) % 28 > 0 ? withBatchim : without;
}
