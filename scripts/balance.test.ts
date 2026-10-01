import { it } from 'vitest';
import { BASE_CONTENT as content } from '../src/engine/baseContent';
import { computeSaju } from '../src/engine/saju';
import { createBattle, resolveRound } from '../src/engine/battle';
import { chooseAction } from '../src/engine/ai';
import { generateEnemies, type Difficulty } from '../src/engine/enemyGen';
import { createRng } from '../src/engine/rng';
import { characterUnit, heroUnit } from '../src/engine/units';
import { heroUnlockedSkills } from '../src/engine/stats';

it('balance', () => {
  const saju = computeSaju({ year: 1995, month: 8, day: 21, hour: 9 });
  for (const [label, ids] of [['N', ['forest_sprite', 'stone_turtle', 'droplet_fairy']], ['SSR', ['azure_dragon', 'yellow_dragon', 'black_tortoise']]] as const) {
    for (const diff of ['easy', 'normal', 'hard'] as Difficulty[]) {
      const row: string[] = [];
      for (const n of [1, 2, 4, 6, 8, 10]) {
        let w = 0, rounds = 0;
        for (let seed = 1; seed <= 100; seed++) {
          const lv = 10;
          const party = [heroUnit(content, { name: 'h', saju, level: lv, equipped: heroUnlockedSkills(content, saju, lv).slice(-4).map((s) => s.id) }), ...ids.map((id) => characterUnit(content, id, lv, 0))];
          const en = generateEnemies(content, { playerLevel: lv, partyElements: [], difficulty: diff, count: n }, createRng(seed * 13));
          let s = createBattle(party, en, seed);
          let r = 0;
          while (!s.result && r < 200) { s = resolveRound(s, [], chooseAction).state; r++; }
          if (s.result === 'win') w++;
          rounds += r;
        }
        row.push(`${n}:${w}%/${(rounds / 100).toFixed(1)}r`);
      }
      console.log(label, diff, row.join('  '));
    }
  }
});
