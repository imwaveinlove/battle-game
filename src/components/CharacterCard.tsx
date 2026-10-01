import type { CharacterDef } from '../engine/schema';
import type { OwnedChar } from '../store/gameStore';
import { ElementBadge, RarityTag } from './ui';

export function CharacterCard({
  def,
  owned,
  selected,
  onClick,
}: {
  def: CharacterDef;
  owned?: OwnedChar;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button className={`ccard rb-${def.rarity} ${selected ? 'selected' : ''} ${owned ? '' : 'locked'}`} onClick={onClick}>
      <div className="ccard-top">
        <RarityTag rarity={def.rarity} />
        <ElementBadge element={def.element} polarity={def.polarity} small />
      </div>
      <div className="ccard-emoji">{def.emoji}</div>
      <div className="ccard-name">{def.name}</div>
      {owned ? (
        <div className="ccard-meta">
          Lv.{owned.level} <span className="stars">{'★'.repeat(owned.stars)}</span>
        </div>
      ) : (
        <div className="ccard-meta muted">미보유</div>
      )}
      {selected && <div className="ccard-check">✓</div>}
    </button>
  );
}
