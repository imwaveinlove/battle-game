import { useNavigate } from 'react-router-dom';
import { expToNext, heroLearnableSkills, heroStats } from '../engine/stats';
import { ELEMENT_INFO, POLARITY_INFO } from '../engine/types';
import { HERO_EMOJI } from '../engine/units';
import { useContent } from '../store/contentStore';
import { heroData, useGame } from '../store/gameStore';
import { SajuBoard } from '../components/SajuBoard';
import { Bar, ElementBadge, OhaengChart, SkillLine, StatGrid } from '../components/ui';

export default function HeroScreen() {
  const content = useContent();
  const { hero, setEquipped, reset } = useGame();
  const nav = useNavigate();
  if (!hero) return null;
  const hd = heroData(hero);
  const dm = hd.saju.dayMaster;
  const learnable = heroLearnableSkills(content, hd.saju);
  const equipped = hero.equipped.filter((id) => learnable.some((s) => s.id === id && s.heroLevel! <= hero.level));

  const toggle = (id: string) => {
    if (equipped.includes(id)) setEquipped(equipped.filter((x) => x !== id));
    else if (equipped.length < 4) setEquipped([...equipped, id]);
  };
  const b = hero.birth;

  return (
    <div className="stack">
      <div className="topbar">
        <b>주인공</b>
        <button className="btn btn-sm" onClick={() => nav('/create')}>
          다시 만들기
        </button>
      </div>
      <section className="card stack">
        <div className="row center-v gap">
          <span className="hero-emoji big">{HERO_EMOJI[dm.element]}</span>
          <div className="grow">
            <div className="row center-v gap">
              <h2>{hero.name}</h2>
              <ElementBadge element={dm.element} polarity={dm.polarity} />
            </div>
            <div className="muted small">
              {b.year}.{b.month}.{b.day} {b.hour !== null ? `${b.hour}시` : '(시간 모름)'} · {POLARITY_INFO[dm.polarity].ko}
              {ELEMENT_INFO[dm.element].ko}
            </div>
            <div className="small">
              Lv.{hero.level} <span className="muted">({hero.exp}/{expToNext(hero.level)})</span>
            </div>
            <Bar value={hero.exp} max={expToNext(hero.level)} kind="exp" />
          </div>
        </div>
        <SajuBoard saju={hd.saju} />
        <OhaengChart ohaeng={hd.saju.ohaeng} />
        <StatGrid stats={heroStats(hd.saju, hero.level)} />
      </section>

      <section className="card stack">
        <div className="row between center-v">
          <h3>스킬 장착</h3>
          <span className="muted">{equipped.length}/4</span>
        </div>
        {learnable.map((s) => {
          const locked = s.heroLevel! > hero.level;
          const on = equipped.includes(s.id);
          return (
            <div key={s.id} className={locked ? 'dim' : ''}>
              <SkillLine
                skill={s}
                right={
                  locked ? (
                    <span className="muted small">Lv.{s.heroLevel}</span>
                  ) : (
                    <button className={`btn btn-sm ${on ? 'btn-primary' : ''}`} onClick={() => toggle(s.id)} disabled={!on && equipped.length >= 4}>
                      {on ? '장착됨' : '장착'}
                    </button>
                  )
                }
              />
            </div>
          );
        })}
      </section>

      <button
        className="btn btn-danger"
        onClick={() => {
          if (confirm('모든 진행 상황(캐릭터, 영석)이 삭제됩니다. 정말 초기화할까요?')) {
            reset();
            nav('/create');
          }
        }}
      >
        데이터 초기화
      </button>
    </div>
  );
}
