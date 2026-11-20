// Game state: one reducer + context, saved to localStorage. Screens read with useGame() and change it with actions.
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { BONUS, TREATS, type FurnitureKind, type PoseId, type TodoId } from '../data/mock';
import { DRIFT_PER_HOUR, MAX_DRIFT_HOURS, gameDay } from './time';
import { bumpLocalSeq } from './saveMeta';
import { MISSIONS, type CounterKey, type Counters } from './missions';
import { asset } from '../lib/asset';

export type StatKey = 'fullness' | 'joy' | 'clean' | 'stamina';
export type Stats = Record<StatKey, number>;

export interface GameState {
  coins: number;
  hearts: number;
  level: number;
  exp: number;
  affection: number;
  stats: Stats;
  todos: Record<TodoId, boolean>;
  bonusClaimed: boolean;
  bestBall: number;
  walk: { found: number[]; bones: number; stamps: number; x: number; y: number };
  deco: { owned: FurnitureKind[]; placed: FurnitureKind | null; flipped: boolean; pose: PoseId };
  careDone: string[];
  mailRead: boolean;
  levelUp: { from: number; to: number } | null;
  /** game day ('YYYY-MM-DD', starts 05:00 KST) the daily items belong to; '' until the first tick */
  day: string;
  /** ms timestamp of the last time drift was applied; 0 until the first tick */
  lastTick: number;
  /** lifetime counters that missions measure */
  counters: Counters;
  /** mission ids whose reward was taken */
  missionsClaimed: string[];
}

export interface Reward {
  coins?: number;
  hearts?: number;
  exp?: number;
  affection?: number;
  stats?: Partial<Stats>;
  todo?: TodoId;
  /** lifetime counters to bump (missions) */
  track?: Partial<Counters>;
}

export const INITIAL: GameState = {
  coins: 3240,
  hearts: 120,
  level: 5,
  exp: 820,
  affection: 76,
  stats: { fullness: 24, joy: 68, clean: 82, stamina: 55 },
  todos: { meal: true, play: true, walk: false, care: false, deco: false },
  bonusClaimed: false,
  bestBall: 1240,
  walk: { found: TREATS.slice(0, 7).map((t) => t.id), bones: 2, stamps: 1, x: 50, y: 54 },
  deco: { owned: ['cushion', 'cabinet'], placed: 'cushion', flipped: false, pose: 'sit' },
  careDone: [],
  mailRead: false,
  levelUp: null,
  day: '',
  lastTick: 0,
  counters: { cooks: 0, threeStarCooks: 0, bonusClaims: 0 },
  missionsClaimed: [],
};

/** EXP needed to go from `level` to the next one (Lv.5 → 1,500 as in the design). */
export const expToNext = (level: number) => level * 300;

export function growthStage(level: number) {
  if (level < 4) return { name: '꼬마 양말이', age: '3개월', img: asset('images/evolve-3m.png') };
  if (level < 7) return { name: '활발한 양말이', age: '6개월', img: asset('images/evolve-6m.png') };
  return { name: '듬직한 양말이', age: '1살', img: asset('images/evolve-6m.png') };
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** Pure: level and exp after gaining `gain` EXP. */
export function addExp(level: number, exp: number, gain: number) {
  let lv = level;
  let xp = exp + gain;
  while (xp >= expToNext(lv)) {
    xp -= expToNext(lv);
    lv += 1;
  }
  return { level: lv, exp: Math.max(0, xp) };
}

function applyReward(s: GameState, r: Reward): GameState {
  const grown = addExp(s.level, s.exp, r.exp ?? 0);
  const stats = { ...s.stats };
  for (const k of Object.keys(r.stats ?? {}) as StatKey[]) stats[k] = clamp(stats[k] + (r.stats?.[k] ?? 0));
  const counters = { ...s.counters };
  for (const k of Object.keys(r.track ?? {}) as CounterKey[]) counters[k] += Math.max(0, r.track?.[k] ?? 0);
  return {
    ...s,
    counters,
    coins: Math.max(0, s.coins + (r.coins ?? 0)),
    hearts: Math.max(0, s.hearts + (r.hearts ?? 0)),
    affection: clamp(s.affection + (r.affection ?? 0)),
    stats,
    level: grown.level,
    exp: grown.exp,
    todos: r.todo ? { ...s.todos, [r.todo]: true } : s.todos,
    levelUp: grown.level > s.level ? { from: s.level, to: grown.level } : s.levelUp,
  };
}

export type Action =
  | { type: 'reward'; reward: Reward }
  | { type: 'pet' }
  | { type: 'toggleTodo'; id: TodoId }
  | { type: 'claimBonus' }
  | { type: 'ballResult'; score: number }
  | { type: 'walkMove'; x: number; y: number; stamina: number }
  | { type: 'pickTreat'; id: number }
  | { type: 'careDone'; key: string; reward: Reward }
  | { type: 'buy'; kind: FurnitureKind; price: number; currency: 'coin' | 'heart' }
  | { type: 'place'; kind: FurnitureKind | null }
  | { type: 'flip' }
  | { type: 'pose'; pose: PoseId }
  | { type: 'readMail' }
  | { type: 'claimMission'; id: string }
  | { type: 'clearLevelUp' }
  | { type: 'tick'; now: number }
  | { type: 'load'; state: GameState; now: number }
  | { type: 'reset' };

/** Time passing: stats drift by elapsed hours, and daily items reset when the game day changes. */
function tick(s: GameState, now: number): GameState {
  let stats = s.stats;
  if (s.lastTick > 0 && now > s.lastTick) {
    const hours = Math.min(MAX_DRIFT_HOURS, (now - s.lastTick) / 3_600_000);
    stats = { ...s.stats };
    for (const k of Object.keys(DRIFT_PER_HOUR) as StatKey[]) stats[k] = clamp(stats[k] + DRIFT_PER_HOUR[k] * hours);
  }
  const today = gameDay(now);
  const newDay = s.day !== '' && s.day !== today;
  return {
    ...s,
    stats,
    day: today,
    lastTick: now,
    ...(newDay
      ? { todos: { meal: false, play: false, walk: false, care: false, deco: false }, bonusClaimed: false, careDone: [], mailRead: false }
      : {}),
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** Turns any saved JSON (local or cloud, possibly older or damaged) into a valid GameState. */
export function normalizeState(raw: unknown): GameState {
  if (!isObj(raw)) return INITIAL;
  const s = raw as Partial<GameState>;
  const stats = isObj(s.stats) ? (s.stats as Partial<Stats>) : {};
  const walk = isObj(s.walk) ? (s.walk as Partial<GameState['walk']>) : {};
  const deco = isObj(s.deco) ? (s.deco as Partial<GameState['deco']>) : {};
  return {
    ...INITIAL,
    coins: Math.max(0, num(s.coins, INITIAL.coins)),
    hearts: Math.max(0, num(s.hearts, INITIAL.hearts)),
    level: Math.max(1, Math.floor(num(s.level, INITIAL.level))),
    exp: Math.max(0, num(s.exp, INITIAL.exp)),
    affection: clamp(num(s.affection, INITIAL.affection)),
    stats: {
      fullness: clamp(num(stats.fullness, INITIAL.stats.fullness)),
      joy: clamp(num(stats.joy, INITIAL.stats.joy)),
      clean: clamp(num(stats.clean, INITIAL.stats.clean)),
      stamina: clamp(num(stats.stamina, INITIAL.stats.stamina)),
    },
    todos: { ...INITIAL.todos, ...(isObj(s.todos) ? (s.todos as Partial<GameState['todos']>) : {}) },
    bonusClaimed: !!s.bonusClaimed,
    bestBall: Math.max(0, num(s.bestBall, INITIAL.bestBall)),
    walk: {
      ...INITIAL.walk,
      ...walk,
      found: Array.isArray(walk.found) ? walk.found.filter((n) => typeof n === 'number') : INITIAL.walk.found,
    },
    deco: { ...INITIAL.deco, ...deco, owned: Array.isArray(deco.owned) ? deco.owned : INITIAL.deco.owned },
    careDone: Array.isArray(s.careDone) ? s.careDone.filter((x) => typeof x === 'string') : [],
    mailRead: !!s.mailRead,
    levelUp: isObj(s.levelUp) ? (s.levelUp as GameState['levelUp']) : null,
    day: typeof s.day === 'string' ? s.day : '',
    lastTick: num(s.lastTick, 0),
    counters: {
      cooks: Math.max(0, num((s.counters as Partial<Counters> | undefined)?.cooks, 0)),
      threeStarCooks: Math.max(0, num((s.counters as Partial<Counters> | undefined)?.threeStarCooks, 0)),
      bonusClaims: Math.max(0, num((s.counters as Partial<Counters> | undefined)?.bonusClaims, 0)),
    },
    missionsClaimed: Array.isArray(s.missionsClaimed)
      ? s.missionsClaimed.filter((x): x is string => typeof x === 'string' && MISSIONS.some((m) => m.id === x))
      : [],
  };
}

export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'reward':
      return applyReward(s, a.reward);
    case 'pet':
      return applyReward(s, { affection: 1, stats: { joy: 1 } });
    case 'toggleTodo':
      return { ...s, todos: { ...s.todos, [a.id]: !s.todos[a.id] } };
    case 'claimBonus':
      if (s.bonusClaimed || Object.values(s.todos).some((d) => !d)) return s;
      return { ...applyReward(s, { ...BONUS, track: { bonusClaims: 1 } }), bonusClaimed: true };
    case 'ballResult': {
      const exp = Math.max(30, Math.min(120, Math.round(a.score / 10)));
      const next = applyReward(s, { coins: 50, exp, stats: { joy: 40, stamina: -15 }, todo: 'play' });
      return { ...next, bestBall: Math.max(s.bestBall, a.score) };
    }
    case 'walkMove':
      return { ...s, walk: { ...s.walk, x: a.x, y: a.y }, stats: { ...s.stats, stamina: clamp(a.stamina) } };
    case 'pickTreat': {
      if (s.walk.found.includes(a.id)) return s;
      const next = applyReward(s, { coins: 10, exp: 20, stats: { joy: 6 }, todo: 'walk' });
      return { ...next, walk: { ...next.walk, found: [...s.walk.found, a.id], bones: s.walk.bones + 1 } };
    }
    case 'careDone':
      if (s.careDone.includes(a.key)) return s;
      return { ...applyReward(s, a.reward), careDone: [...s.careDone, a.key] };
    case 'buy': {
      const wallet = a.currency === 'coin' ? s.coins : s.hearts;
      if (wallet < a.price || s.deco.owned.includes(a.kind)) return s;
      return {
        ...s,
        coins: a.currency === 'coin' ? s.coins - a.price : s.coins,
        hearts: a.currency === 'heart' ? s.hearts - a.price : s.hearts,
        deco: { ...s.deco, owned: [...s.deco.owned, a.kind] },
      };
    }
    case 'place':
      return { ...s, deco: { ...s.deco, placed: a.kind, flipped: false } };
    case 'flip':
      return { ...s, deco: { ...s.deco, flipped: !s.deco.flipped } };
    case 'pose':
      return { ...s, deco: { ...s.deco, pose: a.pose } };
    case 'readMail':
      return s.mailRead ? s : { ...applyReward(s, { coins: 100 }), mailRead: true };
    case 'claimMission': {
      const m = MISSIONS.find((x) => x.id === a.id);
      if (!m || s.missionsClaimed.includes(m.id) || m.progress(s) < m.goal) return s;
      return { ...applyReward(s, m.reward), missionsClaimed: [...s.missionsClaimed, m.id] };
    }
    case 'clearLevelUp':
      return { ...s, levelUp: null };
    case 'tick':
      return tick(s, a.now);
    case 'load':
      return tick(a.state, a.now);
    case 'reset':
      return tick(INITIAL, Date.now());
  }
}

const SAVE_KEY = 'yangmal-save-v1';

/** Local save, applied with the time that passed since it was written. */
function load(): GameState {
  let saved: GameState = INITIAL;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) saved = normalizeState(JSON.parse(raw));
  } catch {
    /* damaged save: start fresh */
  }
  return tick(saved, Date.now());
}

/** Clears this device's save (used on sign-out so the next player starts clean). */
export function clearLocalSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* storage unavailable */
  }
}

const TICK_MS = 60_000;

interface GameApi {
  state: GameState;
  /** Player actions also count toward "unsynced changes"; 'tick' and 'load' do not. */
  dispatch: (a: Action) => void;
  /** Gives a reward and reports whether it caused a level up (so the caller can show the level-up screen). */
  reward: (r: Reward) => boolean;
}

const GameContext = createContext<GameApi | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, load);

  const dispatch = useCallback((a: Action) => {
    if (a.type !== 'tick' && a.type !== 'load') bumpLocalSeq();
    rawDispatch(a);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable: play continues unsaved */
    }
  }, [state]);

  // time passes: every minute, and right away when the player comes back to the tab
  useEffect(() => {
    const now = () => rawDispatch({ type: 'tick', now: Date.now() });
    const id = window.setInterval(now, TICK_MS);
    const onVisible = () => document.visibilityState === 'visible' && now();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const reward = useCallback(
    (r: Reward) => {
      dispatch({ type: 'reward', reward: r });
      return addExp(state.level, state.exp, r.exp ?? 0).level > state.level;
    },
    [state.level, state.exp, dispatch],
  );

  const api = useMemo(() => ({ state, dispatch, reward }), [state, dispatch, reward]);
  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}

export const fmt = (n: number) => n.toLocaleString('ko-KR');

/** Mood line for the home bubble, from the lowest need. */
export function moodLine(stats: Stats) {
  if (stats.fullness < 30) return '배고파요 멍!';
  if (stats.stamina < 20) return '졸려요... 쉬고 싶어요';
  if (stats.clean < 30) return '씻고 싶어요 멍!';
  if (stats.joy < 30) return '심심해요, 놀아 주세요!';
  return '오늘 기분 최고예요!';
}
