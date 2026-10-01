import { useMemo, useState } from 'react';
import { chooseAction } from '../engine/ai';
import { createBattle, resolveRound } from '../engine/battle';
import { generateEnemies, type Difficulty } from '../engine/enemyGen';
import { createRng } from '../engine/rng';
import { computeSaju } from '../engine/saju';
import { parseContent } from '../engine/schema';
import { heroUnlockedSkills } from '../engine/stats';
import { characterUnit, heroUnit } from '../engine/units';
import { useRaw } from '../store/contentStore';
import { F, Num } from './fields';

interface Row {
  count: number;
  win: number;
  rounds: number;
}

export default function Simulator() {
  const raw = useRaw();
  const parsed = useMemo(() => parseContent(raw), [raw]);
  const [level, setLevel] = useState(10);
  const [diff, setDiff] = useState<Difficulty>('normal');
  const [ids, setIds] = useState<string[]>(['bamboo_archer', 'stone_turtle', 'droplet_fairy']);
  const [runs, setRuns] = useState(100);
  const [rows, setRows] = useState<Row[] | null>(null);

  if (!parsed.ok) return <p className="error">검증 오류가 있어 시뮬레이터를 쓸 수 없습니다.</p>;
  const content = parsed.content;

  const run = () => {
    const saju = computeSaju({ year: 1995, month: 8, day: 21, hour: 9 });
    const out: Row[] = [];
    for (let count = 1; count <= 10; count++) {
      let win = 0;
      let rounds = 0;
      for (let i = 0; i < runs; i++) {
        const party = [
          heroUnit(content, { name: '주인공', saju, level, equipped: heroUnlockedSkills(content, saju, level).slice(-4).map((s) => s.id) }),
          ...ids.filter((id) => content.characterMap.has(id)).map((id) => characterUnit(content, id, level, 0)),
        ];
        const enemies = generateEnemies(content, { playerLevel: level, partyElements: [], difficulty: diff, count }, createRng(i * 31 + count));
        let s = createBattle(party, enemies, i + 1);
        let r = 0;
        while (!s.result && r < 200) {
          s = resolveRound(s, [], chooseAction).state;
          r++;
        }
        if (s.result === 'win') win++;
        rounds += r;
      }
      out.push({ count, win: win / runs, rounds: rounds / runs });
    }
    setRows(out);
  };

  return (
    <div className="stack">
      <section className="card stack">
        <h3>자동 전투 밸런스 시뮬레이터</h3>
        <p className="muted small">주인공(샘플 사주) + 선택 캐릭터 3명이 양쪽 모두 AI로 싸웁니다. 적 1~10명 각각 N회.</p>
        <div className="form-grid">
          <F label="파티 레벨">
            <Num value={level} onChange={(v) => setLevel(Math.max(1, Math.min(60, Math.round(v))))} />
          </F>
          <F label="난이도">
            <select value={diff} onChange={(e) => setDiff(e.target.value as Difficulty)}>
              <option value="easy">쉬움</option>
              <option value="normal">보통</option>
              <option value="hard">어려움</option>
            </select>
          </F>
          <F label="적 수별 반복">
            <Num value={runs} onChange={(v) => setRuns(Math.max(10, Math.min(500, Math.round(v))))} />
          </F>
        </div>
        {[0, 1, 2].map((i) => (
          <F key={i} label={`동료 ${i + 1}`}>
            <select value={ids[i] ?? ''} onChange={(e) => setIds(ids.map((x, j) => (j === i ? e.target.value : x)))}>
              {content.characters.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.rarity}] {c.name}
                </option>
              ))}
            </select>
          </F>
        ))}
        <button className="btn btn-primary" onClick={run}>
          시뮬레이션 실행
        </button>
      </section>
      {rows && (
        <table className="table">
          <thead>
            <tr>
              <th>적 수</th>
              <th>승률</th>
              <th>평균 라운드</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.count}>
                <td>{r.count}명</td>
                <td className={r.win < 0.4 ? 'error' : r.win > 0.95 ? 'muted' : ''}>{Math.round(r.win * 100)}%</td>
                <td>{r.rounds.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
