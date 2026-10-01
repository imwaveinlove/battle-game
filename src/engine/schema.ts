import { z } from 'zod';
import { ELEMENTS, RARITIES, STATUS_IDS } from './types';

const element = z.enum(ELEMENTS);
const polarity = z.enum(['yang', 'yin']);

export const statProfileSchema = z.object({
  hp: z.number().min(0.3).max(3),
  atk: z.number().min(0.3).max(3),
  def: z.number().min(0.3).max(3),
  spd: z.number().min(0.3).max(3),
  qi: z.number().min(0.3).max(3),
});

export const ohaengSchema = z.object({
  wood: z.number().min(0),
  fire: z.number().min(0),
  earth: z.number().min(0),
  metal: z.number().min(0),
  water: z.number().min(0),
});

export const skillSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/, 'id는 영문 소문자/숫자/_ 만'),
  name: z.string().min(1),
  element,
  kind: z.enum(['attack', 'heal', 'support']),
  target: z.enum(['enemy', 'allEnemies', 'ally', 'allAllies', 'self']),
  power: z.number().min(0).max(300),
  cost: z.number().int().min(0).max(100),
  effect: z
    .object({
      status: z.enum(STATUS_IDS).optional(),
      chance: z.number().min(0).max(1).optional(),
      buff: z
        .object({
          stat: z.enum(['atk', 'def', 'spd']),
          mult: z.number().min(0.2).max(3),
          turns: z.number().int().min(1).max(9),
        })
        .optional(),
    })
    .optional(),
  /** 주인공이 이 레벨에 도달하고 해당 오행을 사주에 가지고 있으면 습득 */
  heroLevel: z.number().int().min(1).optional(),
  description: z.string().default(''),
});

export const characterSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/, 'id는 영문 소문자/숫자/_ 만'),
  name: z.string().min(1),
  emoji: z.string().min(1),
  element,
  polarity,
  rarity: z.enum(RARITIES),
  profile: statProfileSchema,
  /** 생략 시 주속성 기반 기본 분포 */
  ohaeng: ohaengSchema.optional(),
  skills: z.array(z.string()).min(1).max(4),
  description: z.string().default(''),
});

export const enemyTemplateSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().min(1),
  emoji: z.string().min(1),
  /** 비우면 랜덤 오행 */
  element: element.optional(),
  polarity: polarity.optional(),
  profile: statProfileSchema,
  skills: z.array(z.string()).min(1).max(4),
  /** 출현 가중치 */
  weight: z.number().min(0).default(1),
  minLevel: z.number().int().min(1).default(1),
});

export const enemiesSchema = z.object({
  templates: z.array(enemyTemplateSchema).min(1),
  prefixes: z.object({
    wood: z.array(z.string()).min(1),
    fire: z.array(z.string()).min(1),
    earth: z.array(z.string()).min(1),
    metal: z.array(z.string()).min(1),
    water: z.array(z.string()).min(1),
  }),
  /** 적 수 1~10 각각의 출현 가중치 (index 0 = 1명) */
  countWeights: z.array(z.number().min(0)).length(10),
});

export const gachaSchema = z
  .object({
    singleCost: z.number().int().min(0),
    multiCost: z.number().int().min(0),
    rates: z.object({ N: z.number().min(0), R: z.number().min(0), SR: z.number().min(0), SSR: z.number().min(0) }),
    /** 이 횟수째 뽑기에서 SSR 확정 */
    pity: z.number().int().min(1),
    /** 10연 중 최소 1장 보장 등급 */
    multiGuarantee: z.enum(RARITIES),
    /** 픽업 캐릭터: 해당 등급 당첨 시 이 확률로 픽업 캐릭터 */
    pickup: z.object({ id: z.string(), share: z.number().min(0).max(1) }).nullable(),
    startingSpirit: z.number().int().min(0),
  })
  .refine((g) => Math.abs(g.rates.N + g.rates.R + g.rates.SR + g.rates.SSR - 100) < 0.001, {
    message: '확률 합계는 100이어야 합니다',
  });

export const contentSchema = z.object({
  skills: z.array(skillSchema),
  characters: z.array(characterSchema),
  enemies: enemiesSchema,
  gacha: gachaSchema,
});

export type Skill = z.infer<typeof skillSchema>;
export type CharacterDef = z.infer<typeof characterSchema>;
export type EnemyTemplate = z.infer<typeof enemyTemplateSchema>;
export type EnemiesConfig = z.infer<typeof enemiesSchema>;
export type GachaConfig = z.infer<typeof gachaSchema>;
export type StatProfile = z.infer<typeof statProfileSchema>;

export interface Content {
  skills: Skill[];
  characters: CharacterDef[];
  enemies: EnemiesConfig;
  gacha: GachaConfig;
  skillMap: Map<string, Skill>;
  characterMap: Map<string, CharacterDef>;
}

export type RawContent = z.input<typeof contentSchema>;

/** 스키마 검증 + 참조 무결성(스킬 id, 픽업 id, 중복 id) 검사 */
export function parseContent(raw: unknown): { ok: true; content: Content } | { ok: false; errors: string[] } {
  const res = contentSchema.safeParse(raw);
  if (!res.success) {
    return {
      ok: false,
      errors: res.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    };
  }
  const data = res.data;
  const errors: string[] = [];
  const skillMap = new Map<string, Skill>();
  for (const s of data.skills) {
    if (skillMap.has(s.id)) errors.push(`skills: 중복 id "${s.id}"`);
    skillMap.set(s.id, s);
  }
  const characterMap = new Map<string, CharacterDef>();
  for (const c of data.characters) {
    if (characterMap.has(c.id)) errors.push(`characters: 중복 id "${c.id}"`);
    if (c.id === 'hero') errors.push('characters: "hero"는 예약된 id입니다');
    characterMap.set(c.id, c);
    for (const sid of c.skills) if (!skillMap.has(sid)) errors.push(`characters.${c.id}: 없는 스킬 "${sid}"`);
  }
  for (const t of data.enemies.templates) {
    for (const sid of t.skills) if (!skillMap.has(sid)) errors.push(`enemies.${t.id}: 없는 스킬 "${sid}"`);
  }
  if (data.gacha.pickup && !characterMap.has(data.gacha.pickup.id)) {
    errors.push(`gacha.pickup: 없는 캐릭터 "${data.gacha.pickup.id}"`);
  }
  for (const r of ['N', 'R', 'SR', 'SSR'] as const) {
    if (data.gacha.rates[r] > 0 && !data.characters.some((c) => c.rarity === r)) {
      errors.push(`gacha.rates.${r}: 확률이 있지만 해당 등급 캐릭터가 없습니다`);
    }
  }
  if (data.enemies.countWeights.every((w) => w === 0)) errors.push('enemies.countWeights: 모두 0일 수 없습니다');
  if (errors.length) return { ok: false, errors };
  return { ok: true, content: { ...data, skillMap, characterMap } };
}
