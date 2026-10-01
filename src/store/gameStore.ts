import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { computeSaju, type BirthInput } from '../engine/saju';
import { addExp, MAX_STARS } from '../engine/stats';
import type { Difficulty, Rewards } from '../engine/enemyGen';
import type { PullResult } from '../engine/gacha';
import type { HeroData } from '../engine/units';
import { BASE_CONTENT } from '../engine/baseContent';

export interface HeroSave {
  name: string;
  birth: BirthInput;
  level: number;
  exp: number;
  equipped: string[];
}

export interface OwnedChar {
  level: number;
  exp: number;
  stars: number;
  /** 성급 최대 이후 중복 횟수 */
  extra: number;
}

export interface LevelUpInfo {
  id: string;
  from: number;
  to: number;
}

interface GameState {
  hero: HeroSave | null;
  roster: Record<string, OwnedChar>;
  party: string[];
  spirit: number;
  pity: number;
  record: { wins: number; losses: number; pulls: number };
  difficulty: Difficulty;
  enemyCount: number | null;
  createHero: (name: string, birth: BirthInput, equipped: string[]) => void;
  setEquipped: (ids: string[]) => void;
  toggleParty: (id: string) => void;
  setDifficulty: (d: Difficulty) => void;
  setEnemyCount: (n: number | null) => void;
  applyPull: (results: PullResult[], cost: number, pity: number) => { id: string; isNew: boolean }[];
  applyBattle: (win: boolean, rewards: Rewards, partyIds: string[]) => LevelUpInfo[];
  reset: () => void;
}

const initial = {
  hero: null,
  roster: {},
  party: ['hero'],
  spirit: BASE_CONTENT.gacha.startingSpirit,
  pity: 0,
  record: { wins: 0, losses: 0, pulls: 0 },
  difficulty: 'normal' as Difficulty,
  enemyCount: null,
};

export const PARTY_SIZE = 4;

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...initial,
      createHero: (name, birth, equipped) =>
        set({ hero: { name, birth, level: 1, exp: 0, equipped }, party: ['hero', ...get().party.filter((p) => p !== 'hero')] }),
      setEquipped: (ids) => {
        const h = get().hero;
        if (h) set({ hero: { ...h, equipped: ids.slice(0, 4) } });
      },
      toggleParty: (id) => {
        if (id === 'hero') return;
        const p = get().party;
        if (p.includes(id)) set({ party: p.filter((x) => x !== id) });
        else if (p.length < PARTY_SIZE) set({ party: [...p, id] });
      },
      setDifficulty: (difficulty) => set({ difficulty }),
      setEnemyCount: (enemyCount) => set({ enemyCount }),
      applyPull: (results, cost, pity) => {
        const roster = { ...get().roster };
        const out = results.map(({ character }) => {
          const cur = roster[character.id];
          if (!cur) {
            roster[character.id] = { level: 1, exp: 0, stars: 0, extra: 0 };
            return { id: character.id, isNew: true };
          }
          roster[character.id] =
            cur.stars < MAX_STARS ? { ...cur, stars: cur.stars + 1 } : { ...cur, extra: cur.extra + 1 };
          return { id: character.id, isNew: false };
        });
        const party = get().party.length < PARTY_SIZE ? [...get().party] : get().party;
        for (const r of out) if (r.isNew && party.length < PARTY_SIZE && !party.includes(r.id)) party.push(r.id);
        set({
          roster,
          party,
          spirit: get().spirit - cost,
          pity,
          record: { ...get().record, pulls: get().record.pulls + results.length },
        });
        return out;
      },
      applyBattle: (win, rewards, partyIds) => {
        const st = get();
        const ups: LevelUpInfo[] = [];
        // 패배해도 경험치 30%
        const exp = win ? rewards.exp : Math.round(rewards.exp * 0.3);
        let hero = st.hero;
        const roster = { ...st.roster };
        for (const id of partyIds) {
          if (id === 'hero' && hero) {
            const r = addExp(hero.level, hero.exp, exp);
            if (r.levelsGained) ups.push({ id, from: hero.level, to: r.level });
            hero = { ...hero, level: r.level, exp: r.exp };
          } else if (roster[id]) {
            const c = roster[id];
            const r = addExp(c.level, c.exp, exp);
            if (r.levelsGained) ups.push({ id, from: c.level, to: r.level });
            roster[id] = { ...c, level: r.level, exp: r.exp };
          }
        }
        set({
          hero,
          roster,
          spirit: st.spirit + (win ? rewards.spirit : 0),
          record: { ...st.record, wins: st.record.wins + (win ? 1 : 0), losses: st.record.losses + (win ? 0 : 1) },
        });
        return ups;
      },
      reset: () => set({ ...initial }),
    }),
    { name: 'ohaeng-save', version: 1 },
  ),
);

export function heroData(h: HeroSave): HeroData {
  return { name: h.name, saju: computeSaju(h.birth), level: h.level, equipped: h.equipped };
}
