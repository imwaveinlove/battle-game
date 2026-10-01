import { lazy, Suspense } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useGame } from './store/gameStore';
import { useContentStore } from './store/contentStore';
import Home from './screens/Home';
import CreateHero from './screens/CreateHero';
import Deck from './screens/Deck';
import Gacha from './screens/Gacha';
import HeroScreen from './screens/HeroScreen';
import Battle from './screens/Battle';

const Admin = lazy(() => import('./admin/Admin'));

export default function App() {
  const hero = useGame((s) => s.hero);
  const loc = useLocation();
  const draftOn = useContentStore((s) => s.applyDraft && s.draft !== null);
  const isAdmin = loc.pathname.startsWith('/admin');
  const hideTabs = !hero || isAdmin || loc.pathname === '/battle' || loc.pathname === '/create';

  if (!hero && !isAdmin && loc.pathname !== '/create') return <Navigate to="/create" replace />;

  return (
    <div className={`app ${isAdmin ? 'app-wide' : ''}`}>
      {draftOn && !isAdmin && <div className="draft-banner">어드민 드래프트 콘텐츠 적용 중</div>}
      <main className="screen">
        <Suspense fallback={<p className="center muted">불러오는 중…</p>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateHero />} />
            <Route path="/deck" element={<Deck />} />
            <Route path="/gacha" element={<Gacha />} />
            <Route path="/hero" element={<HeroScreen />} />
            <Route path="/battle" element={<Battle key={loc.key} />} />
            <Route path="/admin/*" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      {!hideTabs && (
        <nav className="tabbar">
          <NavLink to="/" end>
            <span>🏯</span>홈
          </NavLink>
          <NavLink to="/hero">
            <span>☯️</span>주인공
          </NavLink>
          <NavLink to="/deck">
            <span>🃏</span>덱
          </NavLink>
          <NavLink to="/gacha">
            <span>🎴</span>소환
          </NavLink>
        </nav>
      )}
    </div>
  );
}
