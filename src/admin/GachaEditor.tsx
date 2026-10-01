import { useMemo, useState } from 'react';
import { pull } from '../engine/gacha';
import { createRng } from '../engine/rng';
import { parseContent } from '../engine/schema';
import { RARITIES, type Rarity } from '../engine/types';
import { useContentStore, useRaw } from '../store/contentStore';
import { F, Num } from './fields';

export default function GachaEditor() {
  const raw = useRaw();
  const update = useContentStore((s) => s.updateDraft);
  const g = raw.gacha;
  const sum = RARITIES.reduce((s, r) => s + g.rates[r], 0);
  const [sim, setSim] = useState<null | { counts: Record<string, number>; avgSSR: number; n: number }>(null);
  const parsed = useMemo(() => parseContent(raw), [raw]);

  const runSim = () => {
    if (!parsed.ok) return;
    const n = 10000;
    const rng = createRng(Date.now());
    let pity = 0;
    const counts: Record<string, number> = { N: 0, R: 0, SR: 0, SSR: 0 };
    for (let i = 0; i < n / 10; i++) {
      const r = pull(parsed.content, 10, pity, rng);
      pity = r.pityCounter;
      for (const x of r.results) counts[x.character.rarity]++;
    }
    setSim({ counts, avgSSR: n / Math.max(1, counts.SSR), n });
  };

  return (
    <div className="stack">
      <section className="card stack">
        <h3>비용 / 보상</h3>
        <div className="form-grid">
          <F label="1회 비용">
            <Num value={g.singleCost} onChange={(v) => update((d) => void (d.gacha.singleCost = Math.round(v)))} />
          </F>
          <F label="10회 비용">
            <Num value={g.multiCost} onChange={(v) => update((d) => void (d.gacha.multiCost = Math.round(v)))} />
          </F>
          <F label="시작 영석" hint="새 유저 지급">
            <Num value={g.startingSpirit} onChange={(v) => update((d) => void (d.gacha.startingSpirit = Math.round(v)))} />
          </F>
        </div>
      </section>
      <section className="card stack">
        <h3>
          등급 확률 (%) <small className={Math.abs(sum - 100) < 0.001 ? 'muted' : 'error'}>합계 {sum}</small>
        </h3>
        <div className="form-grid">
          {RARITIES.map((r) => (
            <F key={r} label={r}>
              <Num value={g.rates[r]} step={0.1} onChange={(v) => update((d) => void (d.gacha.rates[r] = v))} />
            </F>
          ))}
        </div>
        <div className="form-grid">
          <F label="SSR 천장 (회)">
            <Num value={g.pity} onChange={(v) => update((d) => void (d.gacha.pity = Math.max(1, Math.round(v))))} />
          </F>
          <F label="10연 보장 등급">
            <select value={g.multiGuarantee} onChange={(e) => update((d) => void (d.gacha.multiGuarantee = e.target.value as Rarity))}>
              {RARITIES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </F>
        </div>
      </section>
      <section className="card stack">
        <h3>픽업</h3>
        <div className="form-grid">
          <F label="픽업 캐릭터">
            <select
              value={g.pickup?.id ?? ''}
              onChange={(e) =>
                update((d) => void (d.gacha.pickup = e.target.value ? { id: e.target.value, share: d.gacha.pickup?.share ?? 0.5 } : null))
              }
            >
              <option value="">없음</option>
              {raw.characters.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.rarity}] {c.name}
                </option>
              ))}
            </select>
          </F>
          {g.pickup && (
            <F label="같은 등급 내 픽업 비중 (0~1)">
              <Num value={g.pickup.share} step={0.05} onChange={(v) => update((d) => void (d.gacha.pickup!.share = v))} />
            </F>
          )}
        </div>
      </section>
      <section className="card stack">
        <h3>시뮬레이션</h3>
        <button className="btn" onClick={runSim} disabled={!parsed.ok}>
          10,000회 뽑기 시뮬
        </button>
        {sim && (
          <table className="table small">
            <tbody>
              {RARITIES.map((r) => (
                <tr key={r}>
                  <td>{r}</td>
                  <td>{sim.counts[r]}</td>
                  <td>{((sim.counts[r] / sim.n) * 100).toFixed(2)}%</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3}>평균 {sim.avgSSR.toFixed(1)}회당 SSR 1장 (천장 포함)</td>
              </tr>
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
