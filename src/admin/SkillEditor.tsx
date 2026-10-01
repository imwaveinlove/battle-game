import { useState } from 'react';
import { elementMultiplier } from '../engine/elements';
import type { RawContent } from '../engine/schema';
import { ELEMENT_INFO, ELEMENTS, STATUS_IDS, STATUS_INFO, type Element, type StatusId } from '../engine/types';
import { useContentStore, useRaw } from '../store/contentStore';
import { TARGET_KO } from '../components/ui';
import { ElementSelect, F, ListEditor, Num, uniqueId } from './fields';

type RawSkill = RawContent['skills'][number];
type Kind = RawSkill['kind'];
type Target = RawSkill['target'];

export default function SkillEditor() {
  const raw = useRaw();
  const update = useContentStore((s) => s.updateDraft);
  const [sel, setSel] = useState(0);
  const [el, setEl] = useState<Element | 'all'>('all');
  const s = raw.skills[sel] as RawSkill | undefined;

  const edit = (fn: (s: RawSkill) => void) => update((d) => void fn(d.skills[sel]));

  const add = (base?: RawSkill) => {
    const id = uniqueId(base ? `${base.id}_copy` : 'new_skill', raw.skills.map((x) => x.id));
    update((d) => {
      d.skills.push(
        base
          ? { ...structuredClone(base), id, name: `${base.name} (복제)` }
          : { id, name: '새 스킬', element: 'wood', kind: 'attack', target: 'enemy', power: 60, cost: 10, description: '' },
      );
    });
    setSel(raw.skills.length);
  };

  const usedBy = s
    ? [
        ...raw.characters.filter((c) => c.skills.includes(s.id)).map((c) => c.name),
        ...raw.enemies.templates.filter((t) => t.skills.includes(s.id)).map((t) => `적:${t.name}`),
      ]
    : [];

  const remove = () => {
    if (!s) return;
    if (usedBy.length && !confirm(`사용 중: ${usedBy.join(', ')}\n삭제하면 검증 오류가 납니다. 그래도 삭제?`)) return;
    update((d) => void d.skills.splice(sel, 1));
    setSel(Math.max(0, sel - 1));
  };

  const filtered = raw.skills.map((x, i) => ({ x, i })).filter(({ x }) => el === 'all' || x.element === el);

  return (
    <ListEditor
      items={filtered}
      selected={filtered.findIndex((f) => f.i === sel)}
      onSelect={(i) => setSel(filtered[i].i)}
      render={({ x }) => (
        <>
          <span style={{ color: ELEMENT_INFO[x.element as Element].color }}>{ELEMENT_INFO[x.element as Element].hanja}</span> {x.name}
          {x.heroLevel ? <small className="muted"> ☯{x.heroLevel}</small> : null}
        </>
      )}
      onAdd={() => add()}
      addLabel="새 스킬"
      filter={
        <select value={el} onChange={(e) => setEl(e.target.value as Element | 'all')}>
          <option value="all">전체 오행</option>
          {ELEMENTS.map((e) => (
            <option key={e} value={e}>
              {ELEMENT_INFO[e].hanja}
            </option>
          ))}
        </select>
      }
    >
      {!s ? (
        <p className="muted">스킬을 선택하세요</p>
      ) : (
        <div className="stack">
          <div className="row gap">
            <button className="btn btn-sm" onClick={() => add(s)}>
              복제
            </button>
            <button className="btn btn-sm btn-danger" onClick={remove}>
              삭제
            </button>
          </div>
          <div className="form-grid">
            <F label="id">
              <input value={s.id} onChange={(e) => edit((x) => void (x.id = e.target.value))} />
            </F>
            <F label="이름">
              <input value={s.name} onChange={(e) => edit((x) => void (x.name = e.target.value))} />
            </F>
            <F label="오행">
              <ElementSelect value={s.element as Element} onChange={(v) => edit((x) => void (x.element = v))} />
            </F>
            <F label="종류">
              <select value={s.kind} onChange={(e) => edit((x) => void (x.kind = e.target.value as Kind))}>
                <option value="attack">공격</option>
                <option value="heal">회복</option>
                <option value="support">보조(버프/디버프)</option>
              </select>
            </F>
            <F label="대상">
              <select value={s.target} onChange={(e) => edit((x) => void (x.target = e.target.value as Target))}>
                {(Object.keys(TARGET_KO) as Target[]).map((t) => (
                  <option key={t} value={t}>
                    {TARGET_KO[t]}
                  </option>
                ))}
              </select>
            </F>
            <F label="위력" hint="공격/회복량">
              <Num value={s.power} onChange={(v) => edit((x) => void (x.power = v))} />
            </F>
            <F label="기력 소모" hint="0~100">
              <Num value={s.cost} onChange={(v) => edit((x) => void (x.cost = Math.round(v)))} />
            </F>
            <F label="주인공 습득 레벨" hint="비우면 주인공 불가">
              <input
                type="number"
                value={s.heroLevel ?? ''}
                onChange={(e) => edit((x) => void (x.heroLevel = e.target.value ? Number(e.target.value) : undefined))}
              />
            </F>
          </div>
          <F label="설명">
            <input value={s.description ?? ''} onChange={(e) => edit((x) => void (x.description = e.target.value))} />
          </F>

          <h4>부가 효과</h4>
          <div className="form-grid">
            <F label="상태이상">
              <select
                value={s.effect?.status ?? ''}
                onChange={(e) =>
                  edit((x) => {
                    x.effect = { ...x.effect, status: (e.target.value || undefined) as StatusId | undefined };
                  })
                }
              >
                <option value="">없음</option>
                {STATUS_IDS.map((st) => (
                  <option key={st} value={st}>
                    {STATUS_INFO[st].icon} {STATUS_INFO[st].ko}
                  </option>
                ))}
              </select>
            </F>
            <F label="확률 (0~1)">
              <Num value={s.effect?.chance} step={0.05} onChange={(v) => edit((x) => void (x.effect = { ...x.effect, chance: v }))} />
            </F>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={!!s.effect?.buff}
              onChange={(e) =>
                edit((x) => {
                  x.effect = { ...x.effect, buff: e.target.checked ? { stat: 'atk', mult: 1.3, turns: 3 } : undefined };
                })
              }
            />
            능력치 변화 (배율 &gt;1 버프, &lt;1 디버프)
          </label>
          {s.effect?.buff && (
            <div className="form-grid">
              <F label="스탯">
                <select
                  value={s.effect.buff.stat}
                  onChange={(e) => edit((x) => void (x.effect!.buff!.stat = e.target.value as 'atk' | 'def' | 'spd'))}
                >
                  <option value="atk">공격</option>
                  <option value="def">방어</option>
                  <option value="spd">속도</option>
                </select>
              </F>
              <F label="배율">
                <Num value={s.effect.buff.mult} step={0.05} onChange={(v) => edit((x) => void (x.effect!.buff!.mult = v))} />
              </F>
              <F label="턴">
                <Num value={s.effect.buff.turns} onChange={(v) => edit((x) => void (x.effect!.buff!.turns = Math.round(v)))} />
              </F>
            </div>
          )}

          {s.kind === 'attack' && (
            <>
              <h4>상성 배율 (스킬 → 방어자)</h4>
              <div className="chips">
                {ELEMENTS.map((e) => {
                  const m = elementMultiplier(s.element as Element, e);
                  return (
                    <span key={e} className={`chip-static ${m > 1 ? 'good' : m < 1 ? 'bad' : ''}`}>
                      {ELEMENT_INFO[e].hanja} ×{m}
                    </span>
                  );
                })}
              </div>
            </>
          )}
          <p className="muted small">사용처: {usedBy.length ? usedBy.join(', ') : '없음'}</p>
        </div>
      )}
    </ListEditor>
  );
}
