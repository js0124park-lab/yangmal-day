import { describe, expect, it } from 'vitest';
import { INITIAL, addExp, expToNext, normalizeState, reducer, type GameState } from './state';
import { gameDay } from './time';

const HOUR = 3_600_000;
const at = (iso: string) => Date.parse(iso);
const base = (patch: Partial<GameState> = {}): GameState => ({ ...INITIAL, day: '2026-11-20', lastTick: at('2026-11-20T03:00:00Z'), ...patch });

describe('game day (05:00 KST)', () => {
  it('belongs to the previous day until 04:59 KST', () => {
    expect(gameDay(at('2026-11-20T19:59:59Z'))).toBe('2026-11-20'); // 04:59:59 KST on the 21st
  });
  it('turns over at 05:00 KST', () => {
    expect(gameDay(at('2026-11-20T20:00:00Z'))).toBe('2026-11-21'); // 05:00 KST on the 21st
  });
});

describe('levels', () => {
  it('needs level × 300 EXP (Lv.5 → 1,500 as designed)', () => {
    expect(expToNext(5)).toBe(1500);
  });
  it('carries leftover EXP and can jump several levels', () => {
    expect(addExp(5, 1400, 200)).toEqual({ level: 6, exp: 100 });
    expect(addExp(1, 0, 300 + 600 + 50)).toEqual({ level: 3, exp: 50 });
  });
  it('flags a level up through rewards', () => {
    const s = reducer(base({ exp: 1450 }), { type: 'reward', reward: { exp: 100 } });
    expect(s.level).toBe(6);
    expect(s.levelUp).toEqual({ from: 5, to: 6 });
  });
});

describe('time passing (tick)', () => {
  it('drifts stats by the hours away', () => {
    const s = reducer(base({ stats: { fullness: 50, joy: 50, clean: 50, stamina: 50 } }), { type: 'tick', now: at('2026-11-20T05:00:00Z') });
    expect(s.stats.fullness).toBeCloseTo(40); // -5/h × 2h
    expect(s.stats.joy).toBeCloseTo(44);
    expect(s.stats.clean).toBeCloseTo(46);
    expect(s.stats.stamina).toBeCloseTo(66); // +8/h
  });
  it('clamps stats to 0–100 and caps a long absence at 48 hours', () => {
    const s = reducer(base(), { type: 'tick', now: at('2026-11-20T03:00:00Z') + 500 * HOUR });
    expect(s.stats.fullness).toBe(0);
    expect(s.stats.stamina).toBe(100);
  });
  it('resets daily items on a new game day only', () => {
    const played = base({ todos: { meal: true, play: true, walk: true, care: true, deco: true }, bonusClaimed: true, careDone: ['bath'], mailRead: true });
    const sameDay = reducer(played, { type: 'tick', now: at('2026-11-20T19:00:00Z') });
    expect(sameDay.todos.meal).toBe(true);
    const nextDay = reducer(played, { type: 'tick', now: at('2026-11-20T20:00:00Z') });
    expect(Object.values(nextDay.todos).every((d) => !d)).toBe(true);
    expect(nextDay.bonusClaimed).toBe(false);
    expect(nextDay.careDone).toEqual([]);
    expect(nextDay.mailRead).toBe(false);
    expect(nextDay.day).toBe('2026-11-21');
  });
  it('keeps the design’s starting to-dos on the very first tick', () => {
    const first = reducer(INITIAL, { type: 'tick', now: at('2026-11-20T03:00:00Z') });
    expect(first.todos.meal).toBe(true);
    expect(first.stats).toEqual(INITIAL.stats);
  });
});

describe('rules', () => {
  it('only pays the bonus box once, after all five to-dos', () => {
    const notYet = reducer(base(), { type: 'claimBonus' });
    expect(notYet.coins).toBe(INITIAL.coins);
    const all = base({ todos: { meal: true, play: true, walk: true, care: true, deco: true } });
    const paid = reducer(all, { type: 'claimBonus' });
    expect(paid.coins).toBe(INITIAL.coins + 40);
    expect(paid.hearts).toBe(INITIAL.hearts + 5);
    expect(reducer(paid, { type: 'claimBonus' }).coins).toBe(paid.coins);
  });
  it('refuses purchases the player cannot afford', () => {
    const poor = base({ coins: 100 });
    expect(reducer(poor, { type: 'buy', kind: 'plant', price: 600, currency: 'coin' })).toBe(poor);
    const rich = reducer(base(), { type: 'buy', kind: 'plant', price: 600, currency: 'coin' });
    expect(rich.coins).toBe(INITIAL.coins - 600);
    expect(rich.deco.owned).toContain('plant');
  });
  it('finds each walk treat only once', () => {
    const once = reducer(base(), { type: 'pickTreat', id: 8 });
    const twice = reducer(once, { type: 'pickTreat', id: 8 });
    expect(once.walk.found).toContain(8);
    expect(twice).toBe(once);
    expect(once.todos.walk).toBe(true);
  });
  it('keeps the best ball score', () => {
    expect(reducer(base({ bestBall: 2000 }), { type: 'ballResult', score: 900 }).bestBall).toBe(2000);
    expect(reducer(base({ bestBall: 2000 }), { type: 'ballResult', score: 2500 }).bestBall).toBe(2500);
  });
});

describe('normalizeState (loading saves)', () => {
  it('turns garbage into the starting state', () => {
    expect(normalizeState(null)).toEqual(INITIAL);
    expect(normalizeState('hello')).toEqual(INITIAL);
    expect(normalizeState([1, 2, 3])).toEqual(INITIAL);
  });
  it('fills in fields an older save does not have', () => {
    const s = normalizeState({ coins: 10, stats: { joy: 99 } });
    expect(s.coins).toBe(10);
    expect(s.stats.joy).toBe(99);
    expect(s.stats.fullness).toBe(INITIAL.stats.fullness);
    expect(s.deco).toEqual(INITIAL.deco);
  });
  it('repairs out-of-range and wrong-typed values', () => {
    const s = normalizeState({ coins: -5, level: 0, stats: { fullness: 250, joy: 'x' }, walk: { found: [1, 'a', 3] }, careDone: [1, 'bath'] });
    expect(s.coins).toBe(0);
    expect(s.level).toBe(1);
    expect(s.stats.fullness).toBe(100);
    expect(s.stats.joy).toBe(INITIAL.stats.joy);
    expect(s.walk.found).toEqual([1, 3]);
    expect(s.careDone).toEqual(['bath']);
  });
  it('round-trips a real state unchanged', () => {
    const played = reducer(base(), { type: 'buy', kind: 'plant', price: 600, currency: 'coin' });
    expect(normalizeState(JSON.parse(JSON.stringify(played)))).toEqual(played);
  });
});
