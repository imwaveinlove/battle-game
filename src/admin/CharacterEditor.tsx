import { useState } from 'react';
import type { RawContent } from '../engine/schema';
import { computeStats, defaultOhaeng, powerScore, RARITY_MULT } from '../engine/stats';
import { ELEMENT_INFO, ELEMENTS, RARITIES, STAT_INFO, STAT_KEYS, type Element, type Rarity } from '../engine/types';
import { useContentStore, useRaw } from '../store/contentStore';
import { ElementBadge, RarityTag } from '../components/ui';
import { ElementSelect, F, ListEditor, Num, uniqueId } from './fields';

type RawChar = RawContent['characters'][number];

export default function CharacterEditor() {
  const raw = useRaw();
  const update = useContentStore((s) => s.updateDraft);
  const [sel, setSel] = useState(0);
  const [q, setQ] = useState('');
  const list = raw.characters;
  const c = list[sel] as RawChar | undefined;

  const edit = (fn: (c: RawChar) => void) =>
    update((d) => {
      fn(d.characters[sel]);
    });

  const add = (base?: RawChar) => {
    const id = uniqueId(base ? `${base.id}_copy` : 'new_char', list.map((x) => x.id));
    update((d) => {
      d.characters.push(
        base
          ? { ...structuredClone(base), id, name: `${base.name} (복제)` }
          : {
              id,
              name: '새 캐릭터',
              emoji: '🙂',
              element: 'wood',
              polarity: 'yang',
              rarity: 'N',
              profile: { hp: 1, atk: 1, def: 1, spd: 1, qi: 1 },
              skills: ['wood_lash'],
              description: '',
            },
      );
    });
    setSel(list.length);
  };

  const remove = () => {
    if (!c || !confirm(`${c.name} 삭제?`)) return;
    update((d) => {
      d.characters.splice(sel, 1);
    });
    setSel(Math.max(0, sel - 1));
  };

  const filtered = list.map((x, i) => ({ x, i })).filter(({ x }) => !q || x.name.includes(q) || x.id.includes(q));

  return (
    <ListEditor
      items={filtered}
      selected={filtered.findIndex((f) => f.i === sel)}
      onSelect={(i) => setSel(filtered[i].i)}
      render={({ x }) => (
        <>
          {x.emoji} {x.name} <small className="muted">{x.rarity}</small>
        </>
      )}
      onAdd={() => add()}
      addLabel="새 캐릭터"
      filter={<input placeholder="검색" value={q} onChange={(e) => setQ(e.target.value)} />}
    >
      {!c ? (
        <p className="muted">캐릭터를 선택하세요</p>
      ) : (
        <div className="stack">
          <div className="row gap">
            <button className="btn btn-sm" onClick={() => add(c)}>
              복제
            </button>
            <button className="btn btn-sm btn-danger" onClick={remove}>
              삭제
            </button>
          </div>
          <div className="form-grid">
            <F label="id" hint="영문 소문자/숫자/_ (저장 키, 출시 후 변경 금지)">
              <input value={c.id} onChange={(e) => edit((x) => void (x.id = e.target.value))} />
            </F>
            <F label="이름">
              <input value={c.name} onChange={(e) => edit((x) => void (x.name = e.target.value))} />
            </F>
            <F label="이모지/아이콘">
              <input value={c.emoji} onChange={(e) => edit((x) => void (x.emoji = e.target.value))} />
            </F>
            <F label="등급">
              <select value={c.rarity} onChange={(e) => edit((x) => void (x.rarity = e.target.value as Rarity))}>
                {RARITIES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </F>
            <F label="오행">
              <ElementSelect value={c.element as Element} onChange={(v) => edit((x) => void (x.element = v))} />
            </F>
            <F label="음양">
              <select value={c.polarity} onChange={(e) => edit((x) => void (x.polarity = e.target.value as 'yang' | 'yin'))}>
                <option value="yang">陽 양</option>
                <option value="yin">陰 음</option>
              </select>
            </F>
          </div>
          <F label="설명">
            <input value={c.description ?? ''} onChange={(e) => edit((x) => void (x.description = e.target.value))} />
          </F>

          <h4>능력치 성향 (배율 0.3~3)</h4>
          <div className="form-grid five">
            {STAT_KEYS.map((k) => (
              <F key={k} label={STAT_INFO[k]}>
                <Num value={c.profile[k]} step={0.05} onChange={(v) => edit((x) => void (x.profile[k] = v))} />
              </F>
            ))}
          </div>

          <label className="check">
            <input
              type="checkbox"
              checked={!!c.ohaeng}
              onChange={(e) => edit((x) => void (x.ohaeng = e.target.checked ? defaultOhaeng(x.element as Element) : undefined))}
            />
            오행 분포 직접 지정 (해제 시 주속성 기반 자동)
          </label>
          {c.ohaeng && (
            <div className="form-grid five">
              {ELEMENTS.map((e) => (
                <F key={e} label={ELEMENT_INFO[e].hanja}>
                  <Num value={c.ohaeng![e]} step={0.5} min={0} onChange={(v) => edit((x) => void (x.ohaeng![e] = v))} />
                </F>
              ))}
            </div>
          )}

          <h4>스킬 (최대 4)</h4>
          <SkillPicker raw={raw} value={c.skills} onChange={(v) => edit((x) => void (x.skills = v))} />

          <h4>미리보기</h4>
          <Preview c={c} />
        </div>
      )}
    </ListEditor>
  );
}

export function SkillPicker({ raw, value, onChange }: { raw: RawContent; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="stack-sm">
      <div className="chips">
        {value.map((id, i) => {
          const s = raw.skills.find((x) => x.id === id);
          return (
            <button key={i} className="on" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              {s ? s.name : `⚠ ${id}`} ✕
            </button>
          );
        })}
      </div>
      {value.length < 4 && (
        <select value="" onChange={(e) => e.target.value && onChange([...value, e.target.value])}>
          <option value="">+ 스킬 추가</option>
          {ELEMENTS.map((el) => (
            <optgroup key={el} label={ELEMENT_INFO[el].hanja}>
              {raw.skills
                .filter((s) => s.element === el && !value.includes(s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.kind}/{s.target}/{s.power})
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      )}
    </div>
  );
}

function Preview({ c }: { c: RawChar }) {
  const el = c.element as Element;
  const rows = [1, 20, 40, 60].map((level) => ({
    level,
    s: computeStats({
      ohaeng: c.ohaeng ?? defaultOhaeng(el),
      polarity: c.polarity,
      level,
      profile: c.profile,
      rarityMult: RARITY_MULT[c.rarity as Rarity],
    }),
  }));
  return (
    <div className="stack-sm">
      <div className="row center-v gap">
        <span className="detail-emoji">{c.emoji}</span>
        <RarityTag rarity={c.rarity as Rarity} />
        <b>{c.name}</b>
        <ElementBadge element={el} polarity={c.polarity} small />
      </div>
      <table className="table small">
        <thead>
          <tr>
            <th>Lv</th>
            {STAT_KEYS.map((k) => (
              <th key={k}>{STAT_INFO[k]}</th>
            ))}
            <th>전투력</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ level, s }) => (
            <tr key={level}>
              <td>{level}</td>
              {STAT_KEYS.map((k) => (
                <td key={k}>{s[k]}</td>
              ))}
              <td>{powerScore(s)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
