import { ELEMENTS, ELEMENT_INFO, STAT_KEYS, type Element, type Ohaeng, type Polarity, type Rarity, type Stats } from './types';
import { GENERATES } from './elements';
import type { Content, Skill, StatProfile } from './schema';
import type { Saju } from './saju';

export const MAX_LEVEL = 60;
export const MAX_STARS = 5;
export const BASE_STATS: Stats = { hp: 90, atk: 20, def: 20, spd: 20, qi: 20 };
export const RARITY_MULT: Record<Rarity | 'HERO', number> = { N: 1, R: 1.05, SR: 1.1, SSR: 1.16, HERO: 1.1 };
export const FLAT_PROFILE: StatProfile = { hp: 1, atk: 1, def: 1, spd: 1, qi: 1 };

/** JSON에 ohaeng이 없을 때: 주속성 3, 주속성을 생하는 오행 2, 나머지 1 (합 8) */
export function defaultOhaeng(main: Element): Ohaeng {
  const o = Object.fromEntries(ELEMENTS.map((e) => [e, 1])) as Ohaeng;
  o[main] = 3;
  const mother = ELEMENTS.find((e) => GENERATES[e] === main)!;
  o[mother] = 2;
  const child = GENERATES[main];
  o[child] = 0;
  return o;
}

export interface StatInput {
  ohaeng: Ohaeng;
  polarity: Polarity;
  level: number;
  profile: StatProfile;
  rarityMult: number;
  stars?: number;
}

/**
 * 오행 하나가 스탯 하나를 담당: 木=속도 火=공격 土=체력 金=방어 水=기
 * 양(陽) = 공격·속도 +10%, 음(陰) = 방어·기 +10%
 */
export function computeStats(i: StatInput): Stats {
  const growth = 1 + (i.level - 1) * 0.08;
  const starMult = 1 + 0.05 * (i.stars ?? 0);
  const out = {} as Stats;
  for (const k of STAT_KEYS) {
    const el = ELEMENTS.find((e) => ELEMENT_INFO[e].stat === k)!;
    let v = BASE_STATS[k] * i.profile[k] * (1 + 0.15 * i.ohaeng[el]) * growth * i.rarityMult * starMult;
    if (i.polarity === 'yang' && (k === 'atk' || k === 'spd')) v *= 1.1;
    if (i.polarity === 'yin' && (k === 'def' || k === 'qi')) v *= 1.1;
    out[k] = Math.round(v);
  }
  return out;
}

export function expToNext(level: number): number {
  return 40 + level * 25;
}

/** exp를 더하고 레벨업 처리. */
export function addExp(level: number, exp: number, gained: number): { level: number; exp: number; levelsGained: number } {
  let l = level;
  let e = exp + gained;
  let n = 0;
  while (l < MAX_LEVEL && e >= expToNext(l)) {
    e -= expToNext(l);
    l++;
    n++;
  }
  if (l >= MAX_LEVEL) e = 0;
  return { level: l, exp: e, levelsGained: n };
}

/** 주인공이 배울 수 있는 스킬: heroLevel 이 있고, 사주에 그 오행이 있는 스킬 */
export function heroLearnableSkills(content: Content, saju: Saju): Skill[] {
  return content.skills
    .filter((s) => s.heroLevel !== undefined && saju.ohaeng[s.element] > 0)
    .sort((a, b) => a.heroLevel! - b.heroLevel!);
}

export function heroUnlockedSkills(content: Content, saju: Saju, level: number): Skill[] {
  return heroLearnableSkills(content, saju).filter((s) => s.heroLevel! <= level);
}

export function characterStats(content: Content, id: string, level: number, stars: number): Stats {
  const c = content.characterMap.get(id)!;
  return computeStats({
    ohaeng: c.ohaeng ?? defaultOhaeng(c.element),
    polarity: c.polarity,
    level,
    profile: c.profile,
    rarityMult: RARITY_MULT[c.rarity],
    stars,
  });
}

export function heroStats(saju: Saju, level: number): Stats {
  return computeStats({
    ohaeng: saju.ohaeng,
    polarity: saju.dayMaster.polarity,
    level,
    profile: FLAT_PROFILE,
    rarityMult: RARITY_MULT.HERO,
  });
}

export function powerScore(s: Stats): number {
  return Math.round(s.hp / 3.5 + s.atk + s.def + s.spd * 0.5 + s.qi * 0.5);
}
