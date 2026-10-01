import type { ReactNode } from 'react';
import { ELEMENT_INFO, ELEMENTS } from '../engine/types';

export function F({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>
        {label} {hint && <small className="muted">{hint}</small>}
      </span>
      {children}
    </label>
  );
}

export function Num({
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value ?? ''}
      step={step}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
    />
  );
}

export function ElementSelect<T extends string | undefined>({
  value,
  onChange,
  allowNone,
}: {
  value: T;
  onChange: (v: T) => void;
  allowNone?: boolean;
}) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange((e.target.value || undefined) as T)}>
      {allowNone && <option value="">랜덤</option>}
      {ELEMENTS.map((e) => (
        <option key={e} value={e}>
          {ELEMENT_INFO[e].hanja} {ELEMENT_INFO[e].ko}
        </option>
      ))}
    </select>
  );
}

/** 목록 + 편집 폼 2단 레이아웃 (모바일에선 위아래) */
export function ListEditor<T>({
  items,
  selected,
  onSelect,
  render,
  onAdd,
  addLabel,
  children,
  filter,
}: {
  items: T[];
  selected: number;
  onSelect: (i: number) => void;
  render: (t: T) => ReactNode;
  onAdd: () => void;
  addLabel: string;
  children: ReactNode;
  filter?: ReactNode;
}) {
  return (
    <div className="admin-split">
      <aside className="admin-list">
        <button className="btn btn-primary btn-sm" onClick={onAdd}>
          + {addLabel}
        </button>
        {filter}
        <div className="admin-items">
          {items.map((t, i) => (
            <button key={i} className={i === selected ? 'on' : ''} onClick={() => onSelect(i)}>
              {render(t)}
            </button>
          ))}
        </div>
      </aside>
      <section className="admin-form">{children}</section>
    </div>
  );
}

export function uniqueId(base: string, taken: string[]): string {
  let id = base;
  let n = 2;
  while (taken.includes(id)) id = `${base}_${n++}`;
  return id;
}
