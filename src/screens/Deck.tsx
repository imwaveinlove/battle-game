import { useState } from 'react';
import { RARITIES, ELEMENTS, ELEMENT_INFO, type Element } from '../engine/types';
import { HERO_EMOJI } from '../engine/units';
import { useContent } from '../store/contentStore';
import { heroData, PARTY_SIZE, useGame } from '../store/gameStore';
import { CharacterCard } from '../components/CharacterCard';
import { CharacterDetail } from '../components/CharacterDetail';
import { Modal } from '../components/ui';

export default function Deck() {
  const content = useContent();
  const { roster, party, toggleParty, hero } = useGame();
  const [detail, setDetail] = useState<string | null>(null);
  const [filter, setFilter] = useState<Element | 'all'>('all');
  const [showLocked, setShowLocked] = useState(false);
  if (!hero) return null;
  const hd = heroData(hero);

  const list = content.characters
    .filter((c) => (showLocked ? true : roster[c.id]))
    .filter((c) => filter === 'all' || c.element === filter)
    .sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) || (roster[b.id]?.level ?? 0) - (roster[a.id]?.level ?? 0));

  const validParty = party.filter((id) => id === 'hero' || (roster[id] && content.characterMap.has(id)));

  return (
    <div className="stack">
      <div className="topbar">
        <b>덱 편성</b>
        <span className="muted">
          {validParty.length}/{PARTY_SIZE}
        </span>
      </div>
      <div className="party-row">
        {Array.from({ length: PARTY_SIZE }).map((_, i) => {
          const id = validParty[i];
          if (!id) return <div key={i} className="party-slot empty">+</div>;
          if (id === 'hero')
            return (
              <div key={i} className="party-slot fixed">
                <span>{HERO_EMOJI[hd.saju.dayMaster.element]}</span>
                <small>{hero.name}</small>
                <em>고정</em>
              </div>
            );
          const d = content.characterMap.get(id)!;
          return (
            <button key={i} className={`party-slot rb-${d.rarity}`} onClick={() => toggleParty(id)}>
              <span>{d.emoji}</span>
              <small>{d.name}</small>
              <em>빼기</em>
            </button>
          );
        })}
      </div>
      <p className="muted small">카드를 눌러 파티에 넣거나 빼고, 길게 보려면 ⓘ를 누르세요. 주인공은 항상 출전합니다.</p>

      <div className="chips">
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
          전체
        </button>
        {ELEMENTS.map((e) => (
          <button key={e} className={filter === e ? 'on' : ''} style={{ color: ELEMENT_INFO[e].color }} onClick={() => setFilter(e)}>
            {ELEMENT_INFO[e].hanja}
          </button>
        ))}
        <label className="check small">
          <input type="checkbox" checked={showLocked} onChange={(e) => setShowLocked(e.target.checked)} /> 도감
        </label>
      </div>

      {list.length === 0 && <p className="center muted">보유한 캐릭터가 없어요. 소환에서 뽑아보세요!</p>}
      <div className="card-grid">
        {list.map((c) => (
          <div key={c.id} className="ccard-wrap">
            <CharacterCard
              def={c}
              owned={roster[c.id]}
              selected={party.includes(c.id)}
              onClick={() => (roster[c.id] ? toggleParty(c.id) : setDetail(c.id))}
            />
            <button className="info-btn" onClick={() => setDetail(c.id)} aria-label="상세">
              ⓘ
            </button>
          </div>
        ))}
      </div>

      {detail && (
        <Modal onClose={() => setDetail(null)}>
          <CharacterDetail content={content} id={detail} owned={roster[detail]} />
        </Modal>
      )}
    </div>
  );
}
