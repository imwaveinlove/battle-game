import { characterStats, defaultOhaeng, expToNext, MAX_STARS } from '../engine/stats';
import type { Content } from '../engine/schema';
import type { OwnedChar } from '../store/gameStore';
import { Bar, ElementBadge, OhaengChart, RarityTag, SkillLine, StatGrid } from './ui';

export function CharacterDetail({ content, id, owned }: { content: Content; id: string; owned?: OwnedChar }) {
  const def = content.characterMap.get(id)!;
  const level = owned?.level ?? 1;
  const stars = owned?.stars ?? 0;
  return (
    <div className="stack">
      <div className="row center-v gap">
        <div className="detail-emoji">{def.emoji}</div>
        <div>
          <div className="row center-v gap">
            <RarityTag rarity={def.rarity} />
            <h2>{def.name}</h2>
          </div>
          <ElementBadge element={def.element} polarity={def.polarity} />
          <div className="muted small">{def.description}</div>
        </div>
      </div>
      {owned && (
        <div className="small">
          Lv.{level} · <span className="stars">{'★'.repeat(stars)}{'☆'.repeat(MAX_STARS - stars)}</span>
          {owned.extra > 0 && <span className="muted"> (+{owned.extra})</span>}
          <Bar value={owned.exp} max={expToNext(level)} kind="exp" />
        </div>
      )}
      <StatGrid stats={characterStats(content, id, level, stars)} />
      <OhaengChart ohaeng={def.ohaeng ?? defaultOhaeng(def.element)} />
      <h4>스킬</h4>
      {def.skills.map((sid) => {
        const s = content.skillMap.get(sid);
        return s ? <SkillLine key={sid} skill={s} /> : null;
      })}
      <p className="muted small">중복 획득 시 성급 +1 (★당 전 능력치 +5%)</p>
    </div>
  );
}
