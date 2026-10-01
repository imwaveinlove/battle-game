export const ELEMENTS = ['wood', 'fire', 'earth', 'metal', 'water'] as const;
export type Element = (typeof ELEMENTS)[number];
export type Polarity = 'yang' | 'yin';
export type Ohaeng = Record<Element, number>;

export const STAT_KEYS = ['hp', 'atk', 'def', 'spd', 'qi'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

export const RARITIES = ['N', 'R', 'SR', 'SSR'] as const;
export type Rarity = (typeof RARITIES)[number];

export const STATUS_IDS = ['burn', 'poison', 'freeze', 'stun'] as const;
export type StatusId = (typeof STATUS_IDS)[number];

export const ELEMENT_INFO: Record<Element, { ko: string; hanja: string; color: string; stat: StatKey }> = {
  wood: { ko: '목', hanja: '木', color: '#4caf6a', stat: 'spd' },
  fire: { ko: '화', hanja: '火', color: '#e5533d', stat: 'atk' },
  earth: { ko: '토', hanja: '土', color: '#c9a03c', stat: 'hp' },
  metal: { ko: '금', hanja: '金', color: '#b8c0cc', stat: 'def' },
  water: { ko: '수', hanja: '水', color: '#3d8be5', stat: 'qi' },
};

export const STAT_INFO: Record<StatKey, string> = {
  hp: '체력',
  atk: '공격',
  def: '방어',
  spd: '속도',
  qi: '기(氣)',
};

export const STATUS_INFO: Record<StatusId, { ko: string; icon: string }> = {
  burn: { ko: '화상', icon: '🔥' },
  poison: { ko: '중독', icon: '☠️' },
  freeze: { ko: '빙결', icon: '❄️' },
  stun: { ko: '기절', icon: '💫' },
};

export const POLARITY_INFO: Record<Polarity, { ko: string; hanja: string }> = {
  yang: { ko: '양', hanja: '陽' },
  yin: { ko: '음', hanja: '陰' },
};
