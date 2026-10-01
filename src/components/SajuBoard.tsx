import { BRANCHES, BRANCHES_KO, branchElement, STEMS, STEMS_KO, stemElement, type Saju } from '../engine/saju';
import { ELEMENT_INFO } from '../engine/types';

export function SajuBoard({ saju }: { saju: Saju }) {
  const cols = [
    { label: '시주', p: saju.hour },
    { label: '일주', p: saju.day },
    { label: '월주', p: saju.month },
    { label: '년주', p: saju.year },
  ];
  return (
    <div className="saju">
      {cols.map(({ label, p }) => (
        <div key={label} className={`saju-col ${label === '일주' ? 'saju-me' : ''}`}>
          <small>{label}</small>
          {p ? (
            <>
              <Cell ch={STEMS[p.stem]} ko={STEMS_KO[p.stem]} color={ELEMENT_INFO[stemElement(p.stem)].color} />
              <Cell ch={BRANCHES[p.branch]} ko={BRANCHES_KO[p.branch]} color={ELEMENT_INFO[branchElement(p.branch)].color} />
            </>
          ) : (
            <>
              <div className="saju-cell empty">?</div>
              <div className="saju-cell empty">?</div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function Cell({ ch, ko, color }: { ch: string; ko: string; color: string }) {
  return (
    <div className="saju-cell" style={{ borderColor: color, color }}>
      {ch}
      <small>{ko}</small>
    </div>
  );
}
