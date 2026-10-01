import type { Element, Polarity } from './types';

/** 상생: 木→火→土→金→水→木 */
export const GENERATES: Record<Element, Element> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
};

/** 상극: 木→土→水→火→金→木 */
export const CONTROLS: Record<Element, Element> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
};

export const MULT = {
  overcome: 1.5, // 공격 오행이 방어 오행을 극함
  resisted: 0.67, // 방어 오행이 공격 오행을 극함
  feeding: 0.8, // 공격 오행이 방어 오행을 생함 (적을 키워줌)
  polarityClash: 1.1, // 음양이 반대
  stab: 1.2, // 스킬 오행 = 시전자 오행
};

export function elementMultiplier(attack: Element, defend: Element): number {
  if (CONTROLS[attack] === defend) return MULT.overcome;
  if (CONTROLS[defend] === attack) return MULT.resisted;
  if (GENERATES[attack] === defend) return MULT.feeding;
  return 1;
}

export function polarityMultiplier(a: Polarity, b: Polarity): number {
  return a !== b ? MULT.polarityClash : 1;
}

export function effectivenessLabel(mult: number): string | null {
  if (mult >= 1.5) return '상극! 효과가 굉장하다';
  if (mult <= 0.67) return '역극… 효과가 별로다';
  if (mult < 1) return '상생… 적을 북돋았다';
  return null;
}

/** 이 오행을 극하는 오행 (= 약점) */
export function weaknessOf(e: Element): Element {
  return (Object.keys(CONTROLS) as Element[]).find((k) => CONTROLS[k] === e)!;
}
