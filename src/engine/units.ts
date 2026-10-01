import { START_MP, type BattleUnit, type Side } from './battle';
import type { Saju } from './saju';
import type { Content } from './schema';
import { characterStats, heroStats } from './stats';
import type { Element, Polarity, Stats } from './types';

export interface HeroData {
  name: string;
  saju: Saju;
  level: number;
  equipped: string[];
}

function mk(
  uid: string,
  side: Side,
  refId: string,
  name: string,
  emoji: string,
  element: Element,
  polarity: Polarity,
  level: number,
  max: Stats,
  skillIds: string[],
  content: Content,
): BattleUnit {
  return {
    uid,
    side,
    refId,
    name,
    emoji,
    element,
    polarity,
    level,
    max,
    hp: max.hp,
    mp: START_MP,
    skills: skillIds.map((id) => content.skillMap.get(id)).filter((s) => s !== undefined),
    statuses: [],
    buffs: [],
  };
}

export const HERO_EMOJI: Record<Element, string> = { wood: '🧝', fire: '🧙', earth: '🧔', metal: '🥷', water: '🧜' };

export function heroUnit(content: Content, hero: HeroData): BattleUnit {
  const el = hero.saju.dayMaster.element;
  return mk(
    'a-hero', 'ally', 'hero', hero.name, HERO_EMOJI[el], el, hero.saju.dayMaster.polarity, hero.level,
    heroStats(hero.saju, hero.level), hero.equipped.slice(0, 4), content,
  );
}

export function characterUnit(content: Content, id: string, level: number, stars: number, uid = `a-${id}`, side: Side = 'ally'): BattleUnit {
  const c = content.characterMap.get(id)!;
  return mk(uid, side, id, c.name, c.emoji, c.element, c.polarity, level, characterStats(content, id, level, stars), c.skills, content);
}
