import { useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { parseContent } from '../engine/schema';
import { useContentStore, useRaw } from '../store/contentStore';
import CharacterEditor from './CharacterEditor';
import SkillEditor from './SkillEditor';
import EnemyEditor from './EnemyEditor';
import GachaEditor from './GachaEditor';
import Simulator from './Simulator';
import ExportPanel from './ExportPanel';

// 정적 사이트라 진짜 보안은 아니다: 일반 유저가 실수로 들어오지 않게 막는 용도.
const PASS = import.meta.env.VITE_ADMIN_PASS ?? 'ohaeng';
const KEY = 'ohaeng-admin-auth';

export default function Admin() {
  const [authed, setAuthed] = useState(() => {
    try {
      return sessionStorage.getItem(KEY) === PASS;
    } catch {
      return false;
    }
  });
  const [pw, setPw] = useState('');

  if (!authed) {
    return (
      <form
        className="card stack admin-login"
        onSubmit={(e) => {
          e.preventDefault();
          if (pw === PASS) {
            try {
              sessionStorage.setItem(KEY, pw);
            } catch {
              /* 무시 */
            }
            setAuthed(true);
          } else alert('비밀번호가 틀렸습니다');
        }}
      >
        <h2>어드민</h2>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="비밀번호" autoFocus />
        <button className="btn btn-primary">입장</button>
        <Link to="/" className="muted small center">
          게임으로
        </Link>
      </form>
    );
  }
  return <AdminBody />;
}

function AdminBody() {
  const raw = useRaw();
  const { draft, applyDraft, setApplyDraft, discardDraft } = useContentStore();
  const result = useMemo(() => parseContent(raw), [raw]);

  return (
    <div className="admin stack">
      <header className="admin-head">
        <div className="row between center-v wrap gap">
          <h2>🛠 오행전기 어드민</h2>
          <Link to="/" className="btn btn-sm">
            게임으로
          </Link>
        </div>
        <div className="row center-v wrap gap small">
          <span>{draft ? '✏️ 드래프트 편집 중' : '원본 데이터 (편집 시 드래프트 생성)'}</span>
          <span className={result.ok ? 'ok' : 'error'}>{result.ok ? '✅ 검증 통과' : `❌ 오류 ${result.errors.length}건`}</span>
          <label className="check">
            <input type="checkbox" checked={applyDraft} disabled={!draft} onChange={(e) => setApplyDraft(e.target.checked)} /> 게임에 적용(이
            브라우저)
          </label>
          {draft && (
            <button className="btn btn-sm btn-danger" onClick={() => confirm('드래프트를 버리고 원본으로 되돌릴까요?') && discardDraft()}>
              드래프트 버리기
            </button>
          )}
        </div>
        {!result.ok && (
          <ul className="error small">
            {result.errors.slice(0, 8).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <nav className="admin-tabs">
          <NavLink to="/admin/characters">캐릭터</NavLink>
          <NavLink to="/admin/skills">스킬</NavLink>
          <NavLink to="/admin/enemies">적</NavLink>
          <NavLink to="/admin/gacha">가챠</NavLink>
          <NavLink to="/admin/sim">시뮬레이터</NavLink>
          <NavLink to="/admin/export">내보내기</NavLink>
        </nav>
      </header>
      <Routes>
        <Route index element={<Navigate to="characters" replace />} />
        <Route path="characters" element={<CharacterEditor />} />
        <Route path="skills" element={<SkillEditor />} />
        <Route path="enemies" element={<EnemyEditor />} />
        <Route path="gacha" element={<GachaEditor />} />
        <Route path="sim" element={<Simulator />} />
        <Route path="export" element={<ExportPanel />} />
      </Routes>
    </div>
  );
}
