import type { BattleUnit } from './battle';
import { START_MP } from './battle';
import type { Rng } from './rng';
import type { Content } from './schema';
import { computeStats, defaultOhaeng, MAX_LEVEL } from './stats';
import { ELEMENTS, type Element } from './types';
import { weaknessOf } from './elements';

export type Difficulty = 'easy' | 'normal' | 'hard';
export const DIFFICULTY_INFO: Record<Difficulty, { ko: string; levelOffset: number; reward: number }> = {
  easy: { ko: '쉬움', levelOffset: -2, reward: 0.7 },
  normal: { ko: '보통', levelOffset: 0, reward: 1 },
  hard: { ko: '어려움', levelOffset: 3, reward: 1.6 },
};

export interface EnemyGenOptions {
  playerLevel: number;
  /** 플레이어 파티 오행 — 일부 적이 이 약점을 노리도록 가중 */
  partyElements: Element[];
  difficulty: Difficulty;
  /** 강제 적 수 (1~10). 없으면 countWeights 기반 랜덤 */
  count?: number;
}

/**
 * 1~10명의 적 생성. 적 수가 많을수록 개체는 약하고, 적을수록 보스급으로 강해진다.
 * 전투력 배율 s = (4 / n)^0.6 을 체력·공격에 적용 (n=1 → ×2.3, n=10 → ×0.58)
 */
export function generateEnemies(content: Content, opt: EnemyGenOptions, rng: Rng): BattleUnit[] {
  const cfg = content.enemies;
  const n = opt.count ?? rng.weighted([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], (k) => cfg.countWeights[k - 1]);
  const scale = Math.pow(4 / n, 0.6);
  const baseLevel = opt.playerLevel + DIFFICULTY_INFO[opt.difficulty].levelOffset;
  const out: BattleUnit[] = [];

  for (let i = 0; i < n; i++) {
    const level = Math.max(1, Math.min(MAX_LEVEL, baseLevel + rng.int(-1, 1)));
    const pool = cfg.templates.filter((t) => t.minLevel <= Math.max(level, 1));
    const tpl = rng.weighted(pool.length ? pool : cfg.templates, (t) => t.weight);
    let element: Element;
    if (tpl.element) element = tpl.element;
    else if (opt.partyElements.length && rng.chance(0.35)) {
      // 파티 약점 속성
      element = weaknessOf(rng.pick(opt.partyElements));
    } else element = rng.pick(ELEMENTS);
    const polarity = tpl.polarity ?? (rng.chance(0.5) ? 'yang' : 'yin');
    const stats = computeStats({
      ohaeng: defaultOhaeng(element),
      polarity,
      level,
      profile: tpl.profile,
      rarityMult: 1,
    });
    stats.hp = Math.round(stats.hp * scale * (n === 1 ? 2 : 1));
    stats.atk = Math.round(stats.atk * Math.min(scale, 1.9));
    const prefix = rng.pick(cfg.prefixes[element]);
    const skills = tpl.skills.map((id) => content.skillMap.get(id)).filter((s) => s !== undefined);
    out.push({
      uid: `e${i}`,
      side: 'enemy',
      refId: tpl.id,
      name: n === 1 ? `【두목】${prefix} ${tpl.name}` : `${prefix} ${tpl.name}${n > 1 ? ` ${String.fromCharCode(65 + i)}` : ''}`,
      emoji: tpl.emoji,
      element,
      polarity,
      level,
      max: stats,
      hp: stats.hp,
      mp: START_MP,
      // 적의 공격 스킬 오행은 적 자신의 오행으로 바꿔 '오행 몬스터'가 되게 한다
      skills: skills.map((s) => (s.kind === 'attack' && !tpl.element ? { ...s, element } : s)),
      statuses: [],
      buffs: [],
    });
  }
  return out;
}

export interface Rewards {
  spirit: number;
  exp: number;
}

export function battleRewards(enemies: BattleUnit[], difficulty: Difficulty): Rewards {
  const lvSum = enemies.reduce((s, e) => s + e.level, 0);
  const avg = lvSum / enemies.length;
  const mult = DIFFICULTY_INFO[difficulty].reward;
  return {
    spirit: Math.round((60 + avg * 6 + enemies.length * 6) * mult),
    exp: Math.round((20 + avg * 8 + enemies.length * 3) * mult),
  };
}
