import { Suspense, lazy, useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import TitleScreen from './screens/TitleScreen';
import { ROUTES } from './routes';
import { useGame } from './game/state';
import { useToast } from './components/Toast';
import { PawIcon } from './components/icons';
import { playSound } from './game/sound';

// The title is in the main bundle so it paints at once; every other screen is its own chunk.
const screens = {
  login: () => import('./screens/LoginScreen'),
  settings: () => import('./screens/SettingsScreen'),
  home: () => import('./screens/HomeScreen'),
  todo: () => import('./screens/TodoScreen'),
  missions: () => import('./screens/MissionsScreen'),
  kitchen: () => import('./screens/KitchenScreen'),
  levelUp: () => import('./screens/LevelUpScreen'),
  walk: () => import('./screens/WalkScreen'),
  ball: () => import('./screens/BallScreen'),
  care: () => import('./screens/CareScreen'),
  deco: () => import('./screens/DecoScreen'),
};

const LoginScreen = lazy(screens.login);
const SettingsScreen = lazy(screens.settings);
const HomeScreen = lazy(screens.home);
const TodoScreen = lazy(screens.todo);
const MissionsScreen = lazy(screens.missions);
const KitchenScreen = lazy(screens.kitchen);
const LevelUpScreen = lazy(screens.levelUp);
const WalkScreen = lazy(screens.walk);
const BallScreen = lazy(screens.ball);
const CareScreen = lazy(screens.care);
const DecoScreen = lazy(screens.deco);

/** Warm every screen chunk once the browser is idle, home first, so later taps never wait. */
function usePrefetchScreens() {
  useEffect(() => {
    const order = [screens.home, screens.todo, screens.missions, screens.kitchen, screens.ball, screens.walk, screens.care, screens.deco, screens.levelUp, screens.settings, screens.login];
    let i = 0;
    let handle = 0;
    // Safari has no requestIdleCallback: fall back to a short timer
    const hasIdle = typeof window.requestIdleCallback === 'function';
    const idle = (cb: () => void): number => (hasIdle ? window.requestIdleCallback(cb, { timeout: 2000 }) : setTimeout(cb, 200));
    const next = () => {
      const load = order[i++];
      if (!load) return;
      load()
        .catch(() => {}) // offline: the screen loads when visited
        .finally(() => {
          handle = idle(next);
        });
    };
    handle = idle(next);
    return () => {
      if (hasIdle) window.cancelIdleCallback(handle);
      else clearTimeout(handle);
    };
  }, []);
}

/** Shown for the moment a screen's code is still loading (first visit on a slow connection). */
function ScreenLoading() {
  return (
    <main className="app screen-loading" aria-busy="true">
      <span className="paw-bounce" aria-hidden="true">
        <PawIcon size={44} />
      </span>
      <p role="status">양말이가 달려오는 중…</p>
    </main>
  );
}

/** When a level up happens outside the kitchen flow (walk pickups, ball rewards…), offer the level-up screen. */
function LevelUpWatcher() {
  const { state } = useGame();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const shown = useRef<number | null>(null);

  useEffect(() => {
    const lv = state.levelUp?.to ?? null;
    if (lv === null || shown.current === lv || pathname === ROUTES.levelUp) return;
    shown.current = lv;
    playSound('levelup');
    toast(`레벨업! Lv.${lv}가 되었어요`, { label: '보기', onClick: () => navigate(ROUTES.levelUp) });
  }, [state.levelUp, pathname, toast, navigate]);

  return null;
}

export default function App() {
  const location = useLocation();
  usePrefetchScreens();

  return (
    <>
      {/* keyed wrapper replays the enter animation on every screen change */}
      <div className="route" key={location.pathname}>
        <Suspense fallback={<ScreenLoading />}>
          <Routes location={location}>
            <Route path={ROUTES.title} element={<TitleScreen />} />
            <Route path={ROUTES.login} element={<LoginScreen />} />
            <Route path={ROUTES.settings} element={<SettingsScreen />} />
            <Route path={ROUTES.home} element={<HomeScreen />} />
            <Route path={ROUTES.todo} element={<TodoScreen />} />
            <Route path={ROUTES.missions} element={<MissionsScreen />} />
            <Route path={ROUTES.kitchen} element={<KitchenScreen />} />
            <Route path={ROUTES.levelUp} element={<LevelUpScreen />} />
            <Route path={ROUTES.walk} element={<WalkScreen />} />
            <Route path={ROUTES.ball} element={<BallScreen />} />
            <Route path={ROUTES.care} element={<CareScreen />} />
            <Route path={ROUTES.deco} element={<DecoScreen />} />
            <Route path="*" element={<Navigate to={ROUTES.title} replace />} />
          </Routes>
        </Suspense>
      </div>
      <LevelUpWatcher />
    </>
  );
}
