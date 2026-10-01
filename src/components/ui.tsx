import type { ReactNode } from 'react';
import { ELEMENT_INFO, ELEMENTS, POLARITY_INFO, STAT_INFO, STAT_KEYS, type Element, type Ohaeng, type Polarity, type Rarity, type Stats } from '../engine/types';
import type { Skill } from '../engine/schema';

export function ElementBadge({ element, polarity, small }: { element: Element; polarity?: Polarity; small?: boolean }) {
  const info = ELEMENT_INFO[element];
  return (
    <span className={`badge ${small ? 'badge-sm' : ''}`} style={{ background: info.color }}>
      {info.hanja}
      {polarity && <span className="badge-pol">{POLARITY_INFO[polarity].hanja}</span>}
    </span>
  );
}

export function RarityTag({ rarity }: { rarity: Rarity }) {
  return <span className={`rarity rarity-${rarity}`}>{rarity}</span>;
}

export function Bar({ value, max, kind }: { value: number; max: number; kind: 'hp' | 'mp' | 'exp' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const cls = kind === 'hp' ? (pct < 25 ? 'low' : pct < 55 ? 'mid' : '') : '';
  return (
    <div className={`bar bar-${kind}`}>
      <div className={`bar-fill ${cls}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function OhaengChart({ ohaeng }: { ohaeng: Ohaeng }) {
  const max = Math.max(4, ...ELEMENTS.map((e) => ohaeng[e]));
  return (
    <div className="ohaeng-chart">
      {ELEMENTS.map((e) => (
        <div key={e} className="ohaeng-row">
          <span className="ohaeng-label" style={{ color: ELEMENT_INFO[e].color }}>
            {ELEMENT_INFO[e].hanja} {ELEMENT_INFO[e].ko}
          </span>
          <div className="ohaeng-track">
            <div className="ohaeng-fill" style={{ width: `${(ohaeng[e] / max) * 100}%`, background: ELEMENT_INFO[e].color }} />
          </div>
          <span className="ohaeng-val">{Number(ohaeng[e].toFixed(1))}</span>
          <span className="ohaeng-stat">→ {STAT_INFO[ELEMENT_INFO[e].stat]}</span>
        </div>
      ))}
    </div>
  );
}

export function StatGrid({ stats }: { stats: Stats }) {
  return (
    <div className="stat-grid">
      {STAT_KEYS.map((k) => (
        <div key={k} className="stat-cell">
          <span className="stat-name">{STAT_INFO[k]}</span>
          <b>{stats[k]}</b>
        </div>
      ))}
    </div>
  );
}

const TARGET_KO: Record<Skill['target'], string> = {
  enemy: '적 1',
  allEnemies: '적 전체',
  ally: '아군 1',
  allAllies: '아군 전체',
  self: '자신',
};

export function SkillLine({ skill, right }: { skill: Skill; right?: ReactNode }) {
  return (
    <div className="skill-line">
      <ElementBadge element={skill.element} small />
      <div className="skill-line-main">
        <div>
          <b>{skill.name}</b>{' '}
          <small className="muted">
            {TARGET_KO[skill.target]} · {skill.power > 0 ? `위력 ${skill.power} · ` : ''}기력 {skill.cost}
          </small>
        </div>
        {skill.description && <small className="muted">{skill.description}</small>}
      </div>
      {right}
    </div>
  );
}

export { TARGET_KO };

export function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose} aria-label="닫기">
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
