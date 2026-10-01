import {
  type Action,
  type BattleState,
  type BattleUnit,
  alive,
  computeDamage,
  computeHeal,
  effStat,
  friends,
  opponents,
  unitSkills,
} from './battle';
import type { Rng } from './rng';
import type { Skill } from './schema';

interface Candidate {
  action: Action;
  score: number;
}

function scoreAttack(u: BattleUnit, t: BattleUnit, skill: Skill, aoe: boolean): number {
  const d = computeDamage(u, t, skill, aoe).amount;
  let score = Math.min(d, t.hp);
  if (d >= t.hp) score *= 1.4; // 막타 선호
  const st = skill.effect?.status;
  if (st && !t.statuses.some((x) => x.id === st)) score += t.max.hp * 0.12 * (skill.effect?.chance ?? 1);
  const b = skill.effect?.buff;
  if (b && !t.buffs.some((x) => x.stat === b.stat && x.mult < 1)) score += Math.abs(1 - b.mult) * effStat(u, 'atk');
  return score;
}

function scoreBuff(u: BattleUnit, targets: BattleUnit[], skill: Skill): number {
  const b = skill.effect?.buff;
  if (!b) return 0;
  const up = b.mult > 1;
  const fresh = targets.filter((t) => !t.buffs.some((x) => x.stat === b.stat && x.mult > 1 === up));
  return fresh.length * Math.abs(1 - b.mult) * effStat(u, 'atk') * 1.6;
}

/** 모든 (스킬, 대상) 조합을 점수화한 뒤 상위 후보 중 가중 랜덤 선택 */
export function chooseAction(s: BattleState, u: BattleUnit, rng: Rng): Action {
  const opp = opponents(s, u);
  const fr = friends(s, u);
  const cands: Candidate[] = [];

  for (const skill of unitSkills(u)) {
    if (skill.cost > u.mp) continue;
    const costFactor = 1 - skill.cost / 250;
    const push = (score: number, target?: string) => {
      if (score > 0) cands.push({ action: { actor: u.uid, skillId: skill.id, target }, score: score * costFactor });
    };
    switch (skill.target) {
      case 'enemy':
        for (const t of opp) push(skillValue(u, [t], skill, false), t.uid);
        break;
      case 'allEnemies':
        push(skillValue(u, opp, skill, opp.length > 1));
        break;
      case 'ally':
        for (const t of fr) push(skillValue(u, [t], skill, false), t.uid);
        break;
      case 'allAllies':
        push(skillValue(u, fr, skill, false));
        break;
      case 'self':
        push(skillValue(u, [u], skill, false));
        break;
    }
  }

  if (!cands.length) {
    const t = opp[0];
    return { actor: u.uid, skillId: 'basic', target: t?.uid };
  }
  cands.sort((a, b) => b.score - a.score);
  const top = cands.slice(0, 3);
  return rng.weighted(top, (c) => c.score * c.score).action;
}

function skillValue(u: BattleUnit, targets: BattleUnit[], skill: Skill, aoe: boolean): number {
  const live = targets.filter(alive);
  if (!live.length) return 0;
  if (skill.kind === 'attack') return live.reduce((sum, t) => sum + scoreAttack(u, t, skill, aoe), 0);
  if (skill.kind === 'heal') {
    const amt = computeHeal(u, skill);
    const total = live.reduce((sum, t) => {
      const missing = t.max.hp - t.hp;
      const ratio = t.hp / t.max.hp;
      return sum + Math.min(amt, missing) * (ratio < 0.5 ? 1.6 : ratio < 0.8 ? 0.8 : 0.1);
    }, 0);
    return total + scoreBuff(u, live, skill);
  }
  return scoreBuff(u, live, skill);
}
