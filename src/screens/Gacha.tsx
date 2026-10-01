import { useState } from 'react';
import { pull } from '../engine/gacha';
import { createRng } from '../engine/rng';
import type { CharacterDef } from '../engine/schema';
import { RARITIES } from '../engine/types';
import { useContent } from '../store/contentStore';
import { useGame } from '../store/gameStore';
import { CharacterDetail } from '../components/CharacterDetail';
import { ElementBadge, Modal, RarityTag } from '../components/ui';

interface Shown {
  def: CharacterDef;
  isNew: boolean;
  flipped: boolean;
}

export default function Gacha() {
  const content = useContent();
  const { spirit, pity, applyPull, roster } = useGame();
  const g = content.gacha;
  const [shown, setShown] = useState<Shown[] | null>(null);
  const [rates, setRates] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const pickup = g.pickup ? content.characterMap.get(g.pickup.id) : null;

  const doPull = (count: number) => {
    const cost = count === 1 ? g.singleCost : g.multiCost;
    if (spirit < cost) return;
    const res = pull(content, count, pity, createRng(Date.now() ^ (Math.random() * 1e9)));
    const applied = applyPull(res.results, cost, res.pityCounter);
    setShown(res.results.map((r, i) => ({ def: r.character, isNew: applied[i].isNew, flipped: false })));
  };

  const flip = (i: number) => setShown((s) => s && s.map((x, j) => (j === i ? { ...x, flipped: true } : x)));
  const flipAll = () => setShown((s) => s && s.map((x) => ({ ...x, flipped: true })));
  const best = shown ? shown.reduce((m, x) => Math.max(m, RARITIES.indexOf(x.def.rarity)), 0) : 0;

  return (
    <div className="stack">
      <div className="topbar">
        <b>소환</b>
        <span className="spirit">💠 {spirit.toLocaleString()}</span>
      </div>

      <section className="card banner">
        {pickup ? (
          <>
            <small className="muted">픽업 소환</small>
            <div className="banner-emoji">{pickup.emoji}</div>
            <div className="row center-v gap center">
              <RarityTag rarity={pickup.rarity} />
              <h2>{pickup.name}</h2>
              <ElementBadge element={pickup.element} polarity={pickup.polarity} small />
            </div>
            <small className="muted">
              {pickup.rarity} 당첨 시 {Math.round(g.pickup!.share * 100)}% 확률로 {pickup.name}
            </small>
          </>
        ) : (
          <>
            <div className="banner-emoji">🎴</div>
            <h2>오행 소환</h2>
          </>
        )}
      </section>

      <div className="row gap">
        <button className="btn btn-primary grow" disabled={spirit < g.singleCost} onClick={() => doPull(1)}>
          1회 소환
          <br />
          <small>💠 {g.singleCost}</small>
        </button>
        <button className="btn btn-gold grow" disabled={spirit < g.multiCost} onClick={() => doPull(10)}>
          10회 소환
          <br />
          <small>💠 {g.multiCost}</small>
        </button>
      </div>
      <div className="row between small muted">
        <span>
          SSR 천장까지 {g.pity - pity}회 ({pity}/{g.pity})
        </span>
        <button className="link" onClick={() => setRates(true)}>
          확률 정보
        </button>
      </div>
      <p className="muted small">영석 💠은 전투에서 승리하면 얻을 수 있어요.</p>

      {shown && (
        <div className={`pull-overlay glow-${RARITIES[best]}`} onClick={() => (shown.every((x) => x.flipped) ? setShown(null) : undefined)}>
          <div className={`pull-grid ${shown.length === 1 ? 'single' : ''}`}>
            {shown.map((x, i) => (
              <button
                key={i}
                className={`pull-card ${x.flipped ? 'flipped' : ''} rb-${x.def.rarity}`}
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!x.flipped) flip(i);
                  else setDetail(x.def.id);
                }}
              >
                <div className="pull-inner">
                  <div className={`pull-back back-${x.def.rarity}`}>☯</div>
                  <div className="pull-front">
                    {x.isNew && <span className="new-tag">NEW</span>}
                    <RarityTag rarity={x.def.rarity} />
                    <div className="pull-emoji">{x.def.emoji}</div>
                    <small>{x.def.name}</small>
                    {!x.isNew && <small className="stars">★ +1</small>}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="row gap center">
            {!shown.every((x) => x.flipped) ? (
              <button className="btn" onClick={(e) => (e.stopPropagation(), flipAll())}>
                모두 열기
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => setShown(null)}>
                확인
              </button>
            )}
          </div>
        </div>
      )}

      {rates && (
        <Modal onClose={() => setRates(false)}>
          <h3>확률 정보</h3>
          <table className="table">
            <tbody>
              {(['SSR', 'SR', 'R', 'N'] as const).map((r) => (
                <tr key={r}>
                  <td>
                    <RarityTag rarity={r} />
                  </td>
                  <td>{g.rates[r]}%</td>
                  <td className="muted small">
                    {content.characters
                      .filter((c) => c.rarity === r)
                      .map((c) => c.name)
                      .join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted">
            · {g.pity}회째 소환은 SSR 확정 (SSR 획득 시 초기화)
            <br />· 10회 소환 시 {g.multiGuarantee} 이상 1장 보장
            <br />· 중복 캐릭터는 성급 +1 (최대 ★5)
          </p>
        </Modal>
      )}
      {detail && (
        <Modal onClose={() => setDetail(null)}>
          <CharacterDetail content={content} id={detail} owned={roster[detail]} />
        </Modal>
      )}
    </div>
  );
}
