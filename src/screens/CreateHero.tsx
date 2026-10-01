import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeSaju } from '../engine/saju';
import { heroStats, heroUnlockedSkills } from '../engine/stats';
import { ELEMENT_INFO, POLARITY_INFO } from '../engine/types';
import { HERO_EMOJI } from '../engine/units';
import { useContent } from '../store/contentStore';
import { useGame } from '../store/gameStore';
import { SajuBoard } from '../components/SajuBoard';
import { ElementBadge, OhaengChart, SkillLine, StatGrid } from '../components/ui';

export default function CreateHero() {
  const content = useContent();
  const createHero = useGame((s) => s.createHero);
  const existing = useGame((s) => s.hero);
  const nav = useNavigate();
  const [name, setName] = useState(existing?.name ?? '');
  const [date, setDate] = useState('2000-01-01');
  const [time, setTime] = useState('12:00');
  const [noTime, setNoTime] = useState(false);

  const birth = useMemo(() => {
    const [y, m, d] = date.split('-').map(Number);
    if (!y || !m || !d || y < 1900 || y > 2100) return null;
    const [hh] = time.split(':').map(Number);
    return { year: y, month: m, day: d, hour: noTime || Number.isNaN(hh) ? null : hh };
  }, [date, time, noTime]);

  const saju = useMemo(() => (birth ? computeSaju(birth) : null), [birth]);
  const skills = saju ? heroUnlockedSkills(content, saju, 1) : [];

  const submit = () => {
    if (!birth || !saju || !name.trim()) return;
    if (existing && !confirm('기존 주인공과 진행 상황(레벨)이 새 주인공으로 바뀝니다. 계속할까요?')) return;
    createHero(name.trim(), birth, skills.slice(0, 4).map((s) => s.id));
    nav('/');
  };

  return (
    <div className="stack">
      <header className="title-block">
        <div className="logo">☯</div>
        <h1>오행전기</h1>
        <p className="muted">태어난 순간의 음양오행이 당신의 힘이 됩니다</p>
      </header>

      <section className="card stack">
        <label className="field">
          <span>이름</span>
          <input value={name} maxLength={12} onChange={(e) => setName(e.target.value)} placeholder="주인공 이름" />
        </label>
        <label className="field">
          <span>생년월일 (양력)</span>
          <input type="date" value={date} min="1900-01-01" max="2100-12-31" onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="row">
          <label className="field grow">
            <span>태어난 시간</span>
            <input type="time" value={time} disabled={noTime} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label className="check">
            <input type="checkbox" checked={noTime} onChange={(e) => setNoTime(e.target.checked)} /> 모름
          </label>
        </div>
      </section>

      {saju && (
        <section className="card stack">
          <h3>사주팔자</h3>
          <SajuBoard saju={saju} />
          <div className="row center-v gap">
            <span className="hero-emoji">{HERO_EMOJI[saju.dayMaster.element]}</span>
            <div>
              일간 <ElementBadge element={saju.dayMaster.element} polarity={saju.dayMaster.polarity} />
              <div className="muted small">
                {POLARITY_INFO[saju.dayMaster.polarity].ko}의 {ELEMENT_INFO[saju.dayMaster.element].ko}(
                {ELEMENT_INFO[saju.dayMaster.element].hanja}) 기운 — 주속성
              </div>
            </div>
          </div>
          <OhaengChart ohaeng={saju.ohaeng} />
          <h4>Lv.1 능력치</h4>
          <StatGrid stats={heroStats(saju, 1)} />
          <h4>시작 스킬</h4>
          {skills.map((s) => (
            <SkillLine key={s.id} skill={s} />
          ))}
          <p className="muted small">사주에 있는 오행의 스킬만 배울 수 있어요. 레벨이 오르면 더 해금됩니다.</p>
        </section>
      )}

      <button className="btn btn-primary btn-lg" disabled={!saju || !name.trim()} onClick={submit}>
        {existing ? '주인공 다시 만들기' : '운명 시작하기'}
      </button>
      {existing && (
        <button className="btn" onClick={() => nav('/')}>
          취소
        </button>
      )}
    </div>
  );
}
