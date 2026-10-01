import { ELEMENTS, type Element, type Ohaeng, type Polarity } from './types';

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const STEMS_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
export const BRANCHES_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;

const STEM_ELEMENT: Element[] = ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water'];
const BRANCH_ELEMENT: Element[] = [
  'water', 'earth', 'wood', 'wood', 'earth', 'fire', 'fire', 'earth', 'metal', 'metal', 'earth', 'water',
];

export const stemElement = (i: number) => STEM_ELEMENT[i];
export const branchElement = (i: number) => BRANCH_ELEMENT[i];
export const stemPolarity = (i: number): Polarity => (i % 2 === 0 ? 'yang' : 'yin');

export interface Pillar {
  stem: number;
  branch: number;
}

export interface BirthInput {
  year: number;
  month: number; // 1-12
  day: number;
  /** 0-23, null = 시간 모름 */
  hour: number | null;
  minute?: number;
}

export interface Saju {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar | null;
  /** 오행 분포 (항상 합 8로 정규화) */
  ohaeng: Ohaeng;
  /** 일간(日干) = 본인 */
  dayMaster: { stem: number; element: Element; polarity: Polarity };
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * 절기(節) 시작일 근사, 양력 달력 순서. [월, 일, 사주월 index(寅=0 … 丑=11)]
 * 실제 절기는 해마다 ±1일 정도 달라지지만 게임용으로 충분하다.
 */
const TERM_STARTS: [number, number, number][] = [
  [1, 6, 11], [2, 4, 0], [3, 6, 1], [4, 5, 2], [5, 6, 3], [6, 6, 4],
  [7, 7, 5], [8, 8, 6], [9, 8, 7], [10, 8, 8], [11, 7, 9], [12, 7, 10],
];

/** 寅월=0 기준의 사주 월 번호 */
export function sajuMonthIndex(month: number, day: number): number {
  let idx = 10; // 1/1~1/5 는 전년도 子월
  for (const [m, d, i] of TERM_STARTS) {
    if (month > m || (month === m && day >= d)) idx = i;
  }
  return idx;
}

/** 기준: 2000-01-01 = 戊午일 (60갑자 index 54) */
const DAY_EPOCH = Date.UTC(2000, 0, 1);
const DAY_EPOCH_INDEX = 54;

export function dayPillar(year: number, month: number, day: number): Pillar {
  const days = Math.round((Date.UTC(year, month - 1, day) - DAY_EPOCH) / 86400000);
  const idx = mod(DAY_EPOCH_INDEX + days, 60);
  return { stem: idx % 10, branch: idx % 12 };
}

export function computeSaju(b: BirthInput): Saju {
  // 년주: 입춘(2/4) 이전이면 전년도
  const beforeIpchun = b.month < 2 || (b.month === 2 && b.day < 4);
  const sy = beforeIpchun ? b.year - 1 : b.year;
  const year: Pillar = { stem: mod(sy - 4, 10), branch: mod(sy - 4, 12) };

  // 월주: 오호둔법
  const m = sajuMonthIndex(b.month, b.day);
  const monthStemStart = mod((year.stem % 5) * 2 + 2, 10);
  const month: Pillar = { stem: mod(monthStemStart + m, 10), branch: mod(2 + m, 12) };

  const day = dayPillar(b.year, b.month, b.day);

  // 시주: 오서둔법
  let hour: Pillar | null = null;
  if (b.hour !== null) {
    const branch = mod(Math.floor((b.hour + 1) / 2), 12);
    hour = { stem: mod((day.stem % 5) * 2 + branch, 10), branch };
  }

  const counts: Ohaeng = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const p of [year, month, day, hour]) {
    if (!p) continue;
    counts[STEM_ELEMENT[p.stem]] += 1;
    counts[BRANCH_ELEMENT[p.branch]] += 1;
  }
  const total = ELEMENTS.reduce((s, e) => s + counts[e], 0);
  const ohaeng = Object.fromEntries(ELEMENTS.map((e) => [e, Math.round((counts[e] * 8 * 100) / total) / 100])) as Ohaeng;

  return {
    year,
    month,
    day,
    hour,
    ohaeng,
    dayMaster: { stem: day.stem, element: STEM_ELEMENT[day.stem], polarity: stemPolarity(day.stem) },
  };
}

export function pillarText(p: Pillar): string {
  return `${STEMS[p.stem]}${BRANCHES[p.branch]}`;
}
export function pillarTextKo(p: Pillar): string {
  return `${STEMS_KO[p.stem]}${BRANCHES_KO[p.branch]}`;
}
