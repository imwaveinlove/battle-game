import { useNavigate } from 'react-router-dom';
import { DIFFICULTY_INFO, type Difficulty } from '../engine/enemyGen';
import { expToNext } from '../engine/stats';
import { HERO_EMOJI } from '../engine/units';
import { useContent } from '../store/contentStore';
import { heroData, useGame } from '../store/gameStore';
import { Bar, ElementBadge } from '../components/ui';

export default function Home() {
  const content = useContent();
  const g = useGame();
  const nav = useNavigate();
  if (!g.hero) return null;
  const hd = heroData(g.hero);
  const party = g.party.filter((id) => id === 'hero' || (content.characterMap.has(id) && g.roster[id]));

  return (
    <div className="stack">
      <div className="topbar">
        <b>오행전기</b>
        <span className="spirit">💠 {g.spirit.toLocaleString()}</span>
      </div>

      <section className="card hero-card" onClick={() => nav('/hero')}>
        <div className="hero-emoji big">{HERO_EMOJI[hd.saju.dayMaster.element]}</div>
        <div className="grow">
          <div className="row center-v gap">
            <h2>{g.hero.name}</h2>
            <ElementBadge element={hd.saju.dayMaster.element} polarity={hd.saju.dayMaster.polarity} />
          </div>
          <div className="muted small">
            Lv.{g.hero.level} · {g.record.wins}승 {g.record.losses}패
          </div>
          <Bar value={g.hero.exp} max={expToNext(g.hero.level)} kind="exp" />
        </div>
      </section>

      <section className="card stack">
        <div className="row between center-v">
          <h3>출전 파티</h3>
          <button className="btn btn-sm" onClick={() => nav('/deck')}>
            편성
          </button>
        </div>
        <div className="party-row">
          {Array.from({ length: 4 }).map((_, i) => {
            const id = party[i];
            if (!id) return <div key={i} className="party-slot empty">+</div>;
            if (id === 'hero')
              return (
                <div key={i} className="party-slot">
                  <span>{HERO_EMOJI[hd.saju.dayMaster.element]}</span>
                  <small>{g.hero!.name}</small>
                </div>
              );
            const d = content.characterMap.get(id)!;
            return (
              <div key={i} className={`party-slot rb-${d.rarity}`}>
                <span>{d.emoji}</span>
                <small>{d.name}</small>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card stack">
        <h3>전투</h3>
        <div className="seg">
          {(Object.keys(DIFFICULTY_INFO) as Difficulty[]).map((d) => (
            <button key={d} className={g.difficulty === d ? 'on' : ''} onClick={() => g.setDifficulty(d)}>
              {DIFFICULTY_INFO[d].ko}
            </button>
          ))}
        </div>
        <label className="field">
          <span>적 수</span>
          <select value={g.enemyCount ?? ''} onChange={(e) => g.setEnemyCount(e.target.value ? Number(e.target.value) : null)}>
            <option value="">랜덤 (1~10)</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}명{n === 1 ? ' (두목)' : ''}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary btn-lg" onClick={() => nav('/battle')}>
          ⚔️ 전투 시작
        </button>
        <p className="muted small">적이 적을수록 개체가 강하고, 많을수록 약합니다. 승리하면 영석 💠 획득.</p>
      </section>
    </div>
  );
}
