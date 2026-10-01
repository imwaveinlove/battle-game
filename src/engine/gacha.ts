import type { Rng } from './rng';
import type { CharacterDef, Content } from './schema';
import { RARITIES, type Rarity } from './types';

export interface PullResult {
  character: CharacterDef;
  pityTriggered: boolean;
}

const rank = (r: Rarity) => RARITIES.indexOf(r);

function rollRarity(content: Content, rng: Rng): Rarity {
  const { rates } = content.gacha;
  let r = rng.next() * 100;
  for (const k of ['SSR', 'SR', 'R', 'N'] as const) {
    r -= rates[k];
    if (r < 0) return k;
  }
  return 'N';
}

function pickCharacter(content: Content, rarity: Rarity, rng: Rng): CharacterDef {
  const pool = content.characters.filter((c) => c.rarity === rarity);
  const pu = content.gacha.pickup;
  if (pu) {
    const pc = content.characterMap.get(pu.id);
    if (pc && pc.rarity === rarity && rng.chance(pu.share)) return pc;
  }
  if (!pool.length) {
    // 해당 등급이 비어 있으면 가장 가까운 아래 등급
    for (let i = rank(rarity) - 1; i >= 0; i--) {
      const p = content.characters.filter((c) => c.rarity === RARITIES[i]);
      if (p.length) return rng.pick(p);
    }
    return rng.pick(content.characters);
  }
  return rng.pick(pool);
}

/**
 * count 회 뽑기. pityCounter = 마지막 SSR 이후 뽑은 횟수.
 * pity 번째 뽑기는 SSR 확정, 10연은 multiGuarantee 이상 1장 보장.
 */
export function pull(content: Content, count: number, pityCounter: number, rng: Rng): { results: PullResult[]; pityCounter: number } {
  const g = content.gacha;
  const results: PullResult[] = [];
  let pity = pityCounter;
  for (let i = 0; i < count; i++) {
    pity++;
    let rarity = rollRarity(content, rng);
    let pityTriggered = false;
    if (pity >= g.pity && rarity !== 'SSR') {
      rarity = 'SSR';
      pityTriggered = true;
    }
    if (count >= 10 && i === count - 1 && !results.some((r) => rank(r.character.rarity) >= rank(g.multiGuarantee))) {
      if (rank(rarity) < rank(g.multiGuarantee)) rarity = g.multiGuarantee;
    }
    if (rarity === 'SSR') pity = 0;
    results.push({ character: pickCharacter(content, rarity, rng), pityTriggered });
  }
  return { results, pityCounter: pity };
}
