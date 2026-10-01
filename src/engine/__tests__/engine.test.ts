import { describe, expect, it } from 'vitest';
import { BASE_CONTENT as content } from '../baseContent';
import { computeSaju, dayPillar, pillarText, sajuMonthIndex } from '../saju';
import { elementMultiplier } from '../elements';
import { createBattle, resolveRound, type BattleState } from '../battle';
import { chooseAction } from '../ai';
import { generateEnemies } from '../enemyGen';
import { createRng } from '../rng';
import { pull } from '../gacha';
import { characterUnit, heroUnit } from '../units';
import { addExp, heroUnlockedSkills } from '../stats';
import { parseContent } from '../schema';
import { RAW_BASE_CONTENT } from '../baseContent';

describe('사주', () => {
  it('일주 기준일', () => {
    expect(pillarText(dayPillar(2000, 1, 1))).toBe('戊午');
    // 1949-10-01 은 甲子일로 널리 알려져 있다
    expect(pillarText(dayPillar(1949, 10, 1))).toBe('甲子');
  });

  it('년주는 입춘 기준', () => {
    expect(pillarText(computeSaju({ year: 2024, month: 3, day: 1, hour: null }).year)).toBe('甲辰');
    expect(pillarText(computeSaju({ year: 2024, month: 2, day: 3, hour: null }).year)).toBe('癸卯');
  });

  it('월 index', () => {
    expect(sajuMonthIndex(1, 3)).toBe(10); // 子
    expect(sajuMonthIndex(1, 20)).toBe(11); // 丑
    expect(sajuMonthIndex(2, 4)).toBe(0); // 寅
    expect(sajuMonthIndex(12, 25)).toBe(10); // 子
  });

  it('월주 오호둔 / 시주 오서둔', () => {
    // 甲년 寅월 = 丙寅
    const s = computeSaju({ year: 2024, month: 2, day: 20, hour: 0 });
    expect(pillarText(s.month)).toBe('丙寅');
    // 子시: 일간이 甲/己면 甲子
    const d = dayPillar(2024, 2, 20);
    expect(s.hour!.branch).toBe(0);
    expect(s.hour!.stem).toBe((d.stem % 5) * 2);
  });

  it('오행 합은 8, 시간 모름도 8로 정규화', () => {
    for (const hour of [13, null]) {
      const s = computeSaju({ year: 1990, month: 5, day: 15, hour });
      const sum = Object.values(s.ohaeng).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(8, 1);
    }
  });
});

describe('상성', () => {
  it('상극/역극/상생', () => {
    expect(elementMultiplier('water', 'fire')).toBe(1.5);
    expect(elementMultiplier('fire', 'water')).toBe(0.67);
    expect(elementMultiplier('wood', 'fire')).toBe(0.8);
    expect(elementMultiplier('fire', 'fire')).toBe(1);
  });
});

describe('콘텐츠', () => {
  it('data/*.json 이 스키마를 통과', () => {
    expect(parseContent(RAW_BASE_CONTENT).ok).toBe(true);
  });
  it('없는 스킬 참조는 에러', () => {
    const bad = structuredClone(RAW_BASE_CONTENT);
    bad.characters[0].skills = ['nope'];
    const r = parseContent(bad);
    expect(r.ok).toBe(false);
  });
});

function makeParty(level: number) {
  const saju = computeSaju({ year: 1995, month: 8, day: 21, hour: 9 });
  const equipped = heroUnlockedSkills(content, saju, level).slice(-4).map((s) => s.id);
  return [
    heroUnit(content, { name: '주인공', saju, level, equipped }),
    characterUnit(content, 'bamboo_archer', level, 0),
    characterUnit(content, 'stone_turtle', level, 0),
    characterUnit(content, 'droplet_fairy', level, 0),
  ];
}

function runAuto(state: BattleState, maxRounds = 200) {
  let s = state;
  let rounds = 0;
  while (!s.result && rounds < maxRounds) {
    s = resolveRound(s, [], chooseAction).state;
    rounds++;
  }
  return { s, rounds };
}

describe('배틀', () => {
  it.each([1, 4, 10])('적 %i명 자동 전투가 종료된다', (n) => {
    for (let seed = 1; seed <= 20; seed++) {
      const rng = createRng(seed);
      const enemies = generateEnemies(content, { playerLevel: 10, partyElements: ['wood'], difficulty: 'normal', count: n }, rng);
      expect(enemies).toHaveLength(n);
      const { s } = runAuto(createBattle(makeParty(10), enemies, seed));
      expect(s.result).not.toBeNull();
    }
  });

  it('보통 난이도 승률이 적당하다', () => {
    let wins = 0;
    const N = 200;
    for (let seed = 1; seed <= N; seed++) {
      const rng = createRng(seed * 7);
      const enemies = generateEnemies(content, { playerLevel: 10, partyElements: [], difficulty: 'normal' }, rng);
      if (runAuto(createBattle(makeParty(10), enemies, seed)).s.result === 'win') wins++;
    }
    const rate = wins / N;
    expect(rate).toBeGreaterThan(0.5);
    expect(rate).toBeLessThan(0.98);
  });

  it('같은 시드면 같은 결과 (원본 불변)', () => {
    const enemies = generateEnemies(content, { playerLevel: 5, partyElements: [], difficulty: 'normal', count: 3 }, createRng(3));
    const st = createBattle(makeParty(5), enemies, 42);
    const a = resolveRound(st, [], chooseAction);
    const b = resolveRound(st, [], chooseAction);
    expect(a.events.map((e) => e.text)).toEqual(b.events.map((e) => e.text));
    expect(st.round).toBe(1);
  });
});

describe('가챠', () => {
  it('확률 분포와 천장', () => {
    const rng = createRng(123);
    let pity = 0;
    const counts: Record<string, number> = { N: 0, R: 0, SR: 0, SSR: 0 };
    let sinceSSR = 0;
    let maxGap = 0;
    for (let i = 0; i < 20000; i++) {
      const r = pull(content, 1, pity, rng);
      pity = r.pityCounter;
      const rar = r.results[0].character.rarity;
      counts[rar]++;
      sinceSSR++;
      if (rar === 'SSR') {
        maxGap = Math.max(maxGap, sinceSSR);
        sinceSSR = 0;
      }
    }
    expect(maxGap).toBeLessThanOrEqual(content.gacha.pity);
    expect(counts.N / 20000).toBeGreaterThan(0.55);
    expect(counts.SR / 20000).toBeGreaterThan(0.06);
  });

  it('10연 R 이상 보장', () => {
    const rng = createRng(9);
    for (let i = 0; i < 300; i++) {
      const r = pull(content, 10, 0, rng);
      expect(r.results.some((x) => x.character.rarity !== 'N')).toBe(true);
    }
  });
});

describe('경험치', () => {
  it('레벨업', () => {
    const r = addExp(1, 0, 1000);
    expect(r.level).toBeGreaterThan(5);
  });
});
