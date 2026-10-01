import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chooseAction } from '../engine/ai';
import {
  alive,
  createBattle,
  resolveRound,
  unitSkills,
  type Action,
  type BattleEvent,
  type BattleState,
  type BattleUnit,
} from '../engine/battle';
import { elementMultiplier } from '../engine/elements';
import { battleRewards, generateEnemies, type Rewards } from '../engine/enemyGen';
import { createRng } from '../engine/rng';
import type { Skill } from '../engine/schema';
import { heroUnlockedSkills } from '../engine/stats';
import { STATUS_INFO } from '../engine/types';
import { characterUnit, heroUnit } from '../engine/units';
import { useContent } from '../store/contentStore';
import { heroData, useGame, type LevelUpInfo } from '../store/gameStore';
import { Bar, ElementBadge, TARGET_KO } from '../components/ui';

type Phase = 'select' | 'anim' | 'end';
interface Pop {
  id: number;
  uid: string;
  text: string;
  kind: 'dmg' | 'heal' | 'crit' | 'super' | 'weak';
}

let popId = 0;

export default function Battle() {
  const content = useContent();
  const game = useGame();
  const nav = useNavigate();

  const init = useMemo(() => {
    if (!game.hero) return null;
    const hd = heroData(game.hero);
    const partyIds = game.party.filter((id) => id === 'hero' || (game.roster[id] && content.characterMap.has(id)));
    const allies = partyIds.map((id) =>
      id === 'hero' ? heroUnit(content, hd) : characterUnit(content, id, game.roster[id].level, game.roster[id].stars),
    );
    const avgLv = Math.round(allies.reduce((s, u) => s + u.level, 0) / allies.length);
    const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    const enemies = generateEnemies(
      content,
      { playerLevel: avgLv, partyElements: allies.map((a) => a.element), difficulty: game.difficulty, count: game.enemyCount ?? undefined },
      createRng(seed),
    );
    return { state: createBattle(allies, enemies, seed + 1), partyIds, rewards: battleRewards(enemies, game.difficulty) };
    // 전투는 화면 진입 시 한 번만 생성
  }, []);

  const [battle, setBattle] = useState<BattleState | null>(init?.state ?? null);
  const [disp, setDisp] = useState(() => snapshot(init?.state));
  const [phase, setPhase] = useState<Phase>('select');
  const [pending, setPending] = useState<Action[]>([]);
  const [chosen, setChosen] = useState<Skill | null>(null);
  const [log, setLog] = useState<string[]>(['전투 시작!']);
  const [queue, setQueue] = useState<{ events: BattleEvent[]; next: BattleState } | null>(null);
  const [active, setActive] = useState<{ actor?: string; target?: string }>({});
  const [pops, setPops] = useState<Pop[]>([]);
  const [auto, setAuto] = useState(false);
  const [fast, setFast] = useState(false);
  const [end, setEnd] = useState<{ win: boolean; rewards: Rewards; ups: LevelUpInfo[]; newSkills: Skill[] } | null>(null);
  const ended = useRef(false);

  const allies = battle?.units.filter((u) => u.side === 'ally') ?? [];
  const enemies = battle?.units.filter((u) => u.side === 'enemy') ?? [];
  const waiting = allies.filter((u) => alive(u) && !pending.some((p) => p.actor === u.uid));
  const current = phase === 'select' && !auto ? waiting[0] : undefined;

  const runRound = (actions: Action[]) => {
    if (!battle) return;
    const r = resolveRound(battle, actions, chooseAction);
    setPending([]);
    setChosen(null);
    setPhase('anim');
    setQueue({ events: r.events, next: r.state });
  };

  // 모든 아군 행동 선택 완료 또는 자동 전투
  useEffect(() => {
    if (phase !== 'select' || !battle || battle.result) return;
    if (auto) {
      const t = setTimeout(() => runRound([]), 250);
      return () => clearTimeout(t);
    }
    if (waiting.length === 0) runRound(pending);
  }, [phase, auto, pending, battle]);

  // 이벤트 재생
  useEffect(() => {
    if (!queue) return;
    if (queue.events.length === 0) {
      setBattle(queue.next);
      setDisp(snapshot(queue.next));
      setActive({});
      setQueue(null);
      if (queue.next.result) finish(queue.next);
      else setPhase('select');
      return;
    }
    const [ev, ...rest] = queue.events;
    const delay = (ev.kind === 'action' ? 520 : 420) / (fast ? 2.2 : 1);
    const t = setTimeout(() => {
      setDisp({ hp: ev.hp, mp: ev.mp });
      if (ev.kind === 'action') setActive({ actor: ev.actor });
      else if (ev.target) setActive((a) => ({ ...a, target: ev.target }));
      if (ev.kind !== 'action') setLog((l) => [...l.slice(-30), ev.text]);
      else setLog((l) => [...l.slice(-30), `▶ ${ev.text}`]);
      if ((ev.kind === 'damage' || ev.kind === 'heal') && ev.target && ev.amount) {
        const kind: Pop['kind'] =
          ev.kind === 'heal' ? 'heal' : ev.crit ? 'crit' : (ev.mult ?? 1) >= 1.5 ? 'super' : (ev.mult ?? 1) < 1 ? 'weak' : 'dmg';
        const p: Pop = { id: ++popId, uid: ev.target, text: `${ev.kind === 'heal' ? '+' : '-'}${ev.amount}`, kind };
        setPops((ps) => [...ps, p]);
        setTimeout(() => setPops((ps) => ps.filter((x) => x.id !== p.id)), 900);
      }
      setQueue({ events: rest, next: queue.next });
    }, delay);
    return () => clearTimeout(t);
  }, [queue, fast]);

  const finish = (s: BattleState) => {
    if (ended.current || !init || !game.hero) return;
    ended.current = true;
    const win = s.result === 'win';
    const before = game.hero.level;
    const ups = useGame.getState().applyBattle(win, init.rewards, init.partyIds);
    const after = useGame.getState().hero!.level;
    const hd = heroData(game.hero);
    const newSkills = heroUnlockedSkills(content, hd.saju, after).filter((sk) => sk.heroLevel! > before);
    setEnd({ win, rewards: init.rewards, ups, newSkills });
    setPhase('end');
  };

  if (!battle || !init) {
    return (
      <div className="center stack">
        <p>주인공이 없습니다.</p>
        <button className="btn" onClick={() => nav('/create')}>
          만들기
        </button>
      </div>
    );
  }

  const pickSkill = (sk: Skill) => {
    if (!current) return;
    if (sk.target === 'enemy' || sk.target === 'ally') {
      setChosen(sk);
      return;
    }
    setPending((p) => [...p, { actor: current.uid, skillId: sk.id }]);
  };

  const pickTarget = (u: BattleUnit) => {
    if (!current || !chosen || !alive(u)) return;
    const wantEnemy = chosen.target === 'enemy';
    if ((u.side === 'enemy') !== wantEnemy) return;
    setPending((p) => [...p, { actor: current.uid, skillId: chosen.id, target: u.uid }]);
    setChosen(null);
  };

  const undo = () => {
    if (chosen) setChosen(null);
    else setPending((p) => p.slice(0, -1));
  };

  const targetable = (u: BattleUnit) =>
    !!chosen && alive(u) && (chosen.target === 'enemy' ? u.side === 'enemy' : u.side === 'ally');

  const plannedFor = (uid: string) => pending.find((p) => p.actor === uid);

  const renderUnit = (u: BattleUnit, compact: boolean) => {
    const hp = disp.hp[u.uid] ?? u.hp;
    const mp = disp.mp[u.uid] ?? u.mp;
    const dead = hp <= 0;
    const tgt = targetable(u);
    const cls = [
      'unit',
      compact ? 'compact' : '',
      dead ? 'dead' : '',
      tgt ? 'targetable' : '',
      active.actor === u.uid ? 'acting' : '',
      active.target === u.uid ? 'hit' : '',
      current?.uid === u.uid ? 'current' : '',
      plannedFor(u.uid) ? 'planned' : '',
    ].join(' ');
    // 대상 선택 중이면 상성 미리보기
    let hint: string | null = null;
    if (tgt && chosen && chosen.kind === 'attack') {
      const m = elementMultiplier(chosen.element, u.element);
      hint = m >= 1.5 ? '효과 굉장' : m < 1 ? '효과 별로' : null;
    }
    return (
      <button key={u.uid} className={cls} onClick={() => pickTarget(u)} disabled={!tgt}>
        <div className="unit-head">
          <ElementBadge element={u.element} polarity={u.polarity} small />
          <span className="unit-lv">Lv{u.level}</span>
        </div>
        <div className="unit-emoji">{u.emoji}</div>
        <div className="unit-name">{u.name}</div>
        <Bar value={hp} max={u.max.hp} kind="hp" />
        {!compact && <Bar value={mp} max={100} kind="mp" />}
        {!compact && (
          <div className="unit-nums">
            {hp}/{u.max.hp}
          </div>
        )}
        <div className="unit-status">
          {u.statuses.map((s) => (
            <span key={s.id} title={STATUS_INFO[s.id].ko}>
              {STATUS_INFO[s.id].icon}
            </span>
          ))}
          {u.buffs.map((b, i) => (
            <span key={i} className={b.mult > 1 ? 'buff-up' : 'buff-down'}>
              {{ atk: '공', def: '방', spd: '속' }[b.stat]}
              {b.mult > 1 ? '▲' : '▼'}
            </span>
          ))}
        </div>
        {hint && <div className={`unit-hint ${hint === '효과 굉장' ? 'good' : 'bad'}`}>{hint}</div>}
        {pops
          .filter((p) => p.uid === u.uid)
          .map((p) => (
            <span key={p.id} className={`pop pop-${p.kind}`}>
              {p.text}
            </span>
          ))}
      </button>
    );
  };

  const n = enemies.length;
  const cols = n <= 3 ? n : n === 4 ? 4 : 5;

  return (
    <div className="battle">
      <div className="battle-top">
        <button
          className="btn btn-sm"
          onClick={() => {
            if (phase === 'end' || confirm('전투에서 도망칠까요? (패배 처리)')) {
              if (phase !== 'end' && !ended.current) {
                ended.current = true;
                useGame.getState().applyBattle(false, { spirit: 0, exp: 0 }, []);
              }
              nav('/');
            }
          }}
        >
          {phase === 'end' ? '나가기' : '도망'}
        </button>
        <span className="muted small">
          {battle.round}라운드 · 적 {enemies.filter((e) => (disp.hp[e.uid] ?? e.hp) > 0).length}/{n}
        </span>
        <div className="row gap-sm">
          <button className={`btn btn-sm ${fast ? 'btn-primary' : ''}`} onClick={() => setFast(!fast)}>
            ×{fast ? 2 : 1}
          </button>
          <button className={`btn btn-sm ${auto ? 'btn-primary' : ''}`} onClick={() => setAuto(!auto)}>
            자동
          </button>
        </div>
      </div>

      <div className="field-enemy" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {enemies.map((u) => renderUnit(u, n > 4))}
      </div>

      <div className="battle-log">
        {log.slice(-3).map((l, i) => (
          <div key={log.length - 3 + i}>{l}</div>
        ))}
      </div>

      <div className="field-ally">{allies.map((u) => renderUnit(u, false))}</div>

      <div className="action-panel">
        {phase === 'select' && current && (
          <>
            <div className="row between center-v">
              <span>
                <b>{current.name}</b>
                <span className="muted small"> 의 행동 {chosen ? `→ ${TARGET_KO[chosen.target]} 선택` : ''}</span>
              </span>
              {(pending.length > 0 || chosen) && (
                <button className="btn btn-sm" onClick={undo}>
                  ↩ 취소
                </button>
              )}
            </div>
            {chosen ? (
              <p className="center muted">{chosen.target === 'enemy' ? '공격할 적을 누르세요' : '대상 아군을 누르세요'}</p>
            ) : (
              <div className="skill-grid">
                {unitSkills(current).map((sk) => (
                  <button
                    key={sk.id}
                    className="skill-btn"
                    style={{ borderColor: `var(--el-${sk.element})` }}
                    disabled={sk.cost > current.mp}
                    onClick={() => pickSkill(sk)}
                  >
                    <span className="skill-name">
                      <ElementBadge element={sk.element} small /> {sk.name}
                    </span>
                    <small className="muted">
                      {TARGET_KO[sk.target]}
                      {sk.power > 0 ? ` · ${sk.power}` : ''} · 기력 {sk.cost}
                    </small>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {phase === 'select' && auto && <p className="center muted">자동 전투 중…</p>}
        {phase === 'anim' && <p className="center muted">…</p>}
      </div>

      {end && (
        <div className="modal-back">
          <div className="modal result">
            <h2 className={end.win ? 'win' : 'lose'}>{end.win ? '승리!' : '패배…'}</h2>
            {end.win ? (
              <p>
                💠 영석 +{end.rewards.spirit}
                <br />
                경험치 +{end.rewards.exp}
              </p>
            ) : (
              <p className="muted">경험치 +{Math.round(end.rewards.exp * 0.3)}</p>
            )}
            {end.ups.map((u) => (
              <div key={u.id} className="small">
                ⬆ {u.id === 'hero' ? game.hero?.name : content.characterMap.get(u.id)?.name} Lv.{u.from} → {u.to}
              </div>
            ))}
            {end.newSkills.length > 0 && (
              <div className="small">✨ 새 스킬 해금: {end.newSkills.map((s) => s.name).join(', ')} — 주인공 화면에서 장착하세요</div>
            )}
            <div className="row gap">
              <button className="btn grow" onClick={() => nav('/')}>
                홈으로
              </button>
              <button className="btn btn-primary grow" onClick={() => nav('/battle', { replace: true })}>
                다시 전투
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function snapshot(s?: BattleState | null) {
  return {
    hp: Object.fromEntries((s?.units ?? []).map((u) => [u.uid, u.hp])) as Record<string, number>,
    mp: Object.fromEntries((s?.units ?? []).map((u) => [u.uid, u.mp])) as Record<string, number>,
  };
}
