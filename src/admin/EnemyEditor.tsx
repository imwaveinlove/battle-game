import { useMemo, useState } from 'react';
import { generateEnemies, type Difficulty } from '../engine/enemyGen';
import { createRng } from '../engine/rng';
import { parseContent, type RawContent } from '../engine/schema';
import { ELEMENT_INFO, ELEMENTS, STAT_INFO, STAT_KEYS, type Element } from '../engine/types';
import { useContentStore, useRaw } from '../store/contentStore';
import { ElementBadge } from '../components/ui';
import { SkillPicker } from './CharacterEditor';
import { ElementSelect, F, ListEditor, Num, uniqueId } from './fields';

type RawTpl = RawContent['enemies']['templates'][number];

export default function EnemyEditor() {
  const raw = useRaw();
  const update = useContentStore((s) => s.updateDraft);
  const [sel, setSel] = useState(0);
  const t = raw.enemies.templates[sel] as RawTpl | undefined;
  const edit = (fn: (t: RawTpl) => void) => update((d) => void fn(d.enemies.templates[sel]));

  const add = () => {
    const id = uniqueId('new_enemy', raw.enemies.templates.map((x) => x.id));
    update((d) =>
      void d.enemies.templates.push({
        id,
        name: '새 적',
        emoji: '👾',
        profile: { hp: 1, atk: 1, def: 1, spd: 1, qi: 1 },
        skills: ['mob_bite'],
        weight: 1,
        minLevel: 1,
      }),
    );
    setSel(raw.enemies.templates.length);
  };

  return (
    <div className="stack">
      <ListEditor
        items={raw.enemies.templates}
        selected={sel}
        onSelect={setSel}
        render={(x) => (
          <>
            {x.emoji} {x.name} <small className="muted">w{x.weight ?? 1}</small>
          </>
        )}
        onAdd={add}
        addLabel="새 적 템플릿"
      >
        {!t ? (
          <p className="muted">템플릿을 선택하세요</p>
        ) : (
          <div className="stack">
            <button
              className="btn btn-sm btn-danger"
              onClick={() => {
                if (confirm(`${t.name} 삭제?`)) {
                  update((d) => void d.enemies.templates.splice(sel, 1));
                  setSel(0);
                }
              }}
            >
              삭제
            </button>
            <div className="form-grid">
              <F label="id">
                <input value={t.id} onChange={(e) => edit((x) => void (x.id = e.target.value))} />
              </F>
              <F label="이름" hint="앞에 오행 접두어가 붙음">
                <input value={t.name} onChange={(e) => edit((x) => void (x.name = e.target.value))} />
              </F>
              <F label="이모지">
                <input value={t.emoji} onChange={(e) => edit((x) => void (x.emoji = e.target.value))} />
              </F>
              <F label="오행" hint="랜덤이면 공격 스킬도 그 오행으로 변환">
                <ElementSelect allowNone value={t.element as Element | undefined} onChange={(v) => edit((x) => void (x.element = v))} />
              </F>
              <F label="음양">
                <select
                  value={t.polarity ?? ''}
                  onChange={(e) => edit((x) => void (x.polarity = (e.target.value || undefined) as 'yang' | 'yin' | undefined))}
                >
                  <option value="">랜덤</option>
                  <option value="yang">陽</option>
                  <option value="yin">陰</option>
                </select>
              </F>
              <F label="출현 가중치">
                <Num value={t.weight} step={0.1} onChange={(v) => edit((x) => void (x.weight = v))} />
              </F>
              <F label="최소 출현 레벨">
                <Num value={t.minLevel} onChange={(v) => edit((x) => void (x.minLevel = Math.max(1, Math.round(v))))} />
              </F>
            </div>
            <h4>능력치 성향</h4>
            <div className="form-grid five">
              {STAT_KEYS.map((k) => (
                <F key={k} label={STAT_INFO[k]}>
                  <Num value={t.profile[k]} step={0.05} onChange={(v) => edit((x) => void (x.profile[k] = v))} />
                </F>
              ))}
            </div>
            <h4>스킬</h4>
            <SkillPicker raw={raw} value={t.skills} onChange={(v) => edit((x) => void (x.skills = v))} />
          </div>
        )}
      </ListEditor>

      <section className="card stack">
        <h3>오행별 이름 접두어</h3>
        <div className="form-grid">
          {ELEMENTS.map((e) => (
            <F key={e} label={`${ELEMENT_INFO[e].hanja} ${ELEMENT_INFO[e].ko}`} hint="쉼표로 구분">
              <input
                value={raw.enemies.prefixes[e].join(',')}
                onChange={(ev) =>
                  update((d) => void (d.enemies.prefixes[e] = ev.target.value.split(',').map((s) => s.trim()).filter(Boolean)))
                }
              />
            </F>
          ))}
        </div>
        <h3>적 수 출현 가중치</h3>
        <div className="form-grid ten">
          {raw.enemies.countWeights.map((w, i) => (
            <F key={i} label={`${i + 1}명`}>
              <Num value={w} onChange={(v) => update((d) => void (d.enemies.countWeights[i] = Math.max(0, v)))} />
            </F>
          ))}
        </div>
      </section>

      <SamplePreview raw={raw} />
    </div>
  );
}

function SamplePreview({ raw }: { raw: RawContent }) {
  const [seed, setSeed] = useState(1);
  const [level, setLevel] = useState(10);
  const [diff, setDiff] = useState<Difficulty>('normal');
  const parsed = useMemo(() => parseContent(raw), [raw]);
  const sample = useMemo(
    () => (parsed.ok ? generateEnemies(parsed.content, { playerLevel: level, partyElements: [], difficulty: diff }, createRng(seed)) : []),
    [parsed, seed, level, diff],
  );
  return (
    <section className="card stack">
      <h3>샘플 적 파티 생성</h3>
      <div className="row gap wrap">
        <F label="플레이어 레벨">
          <Num value={level} onChange={(v) => setLevel(Math.max(1, v))} />
        </F>
        <F label="난이도">
          <select value={diff} onChange={(e) => setDiff(e.target.value as Difficulty)}>
            <option value="easy">쉬움</option>
            <option value="normal">보통</option>
            <option value="hard">어려움</option>
          </select>
        </F>
        <button className="btn" onClick={() => setSeed(seed + 1)}>
          🎲 다시 생성
        </button>
      </div>
      {!parsed.ok && <p className="error">검증 오류가 있어 미리보기 불가</p>}
      <table className="table small">
        <thead>
          <tr>
            <th></th>
            <th>이름</th>
            <th>Lv</th>
            <th>HP</th>
            <th>공격</th>
            <th>방어</th>
            <th>속도</th>
          </tr>
        </thead>
        <tbody>
          {sample.map((u) => (
            <tr key={u.uid}>
              <td>
                {u.emoji} <ElementBadge element={u.element} polarity={u.polarity} small />
              </td>
              <td>{u.name}</td>
              <td>{u.level}</td>
              <td>{u.max.hp}</td>
              <td>{u.max.atk}</td>
              <td>{u.max.def}</td>
              <td>{u.max.spd}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
