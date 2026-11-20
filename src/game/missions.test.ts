import { describe, expect, it } from 'vitest';
import { INITIAL, normalizeState, reducer, type GameState } from './state';
import { claimableCount, missionViews, rewardText } from './missions';

const base = (patch: Partial<GameState> = {}): GameState => ({ ...INITIAL, day: '2026-11-20', lastTick: 1, ...patch });
const view = (s: GameState, id: string) => missionViews(s).find((m) => m.id === id)!;

describe('missions', () => {
  it('start with progress from the design’s starting state and nothing to claim', () => {
    const s = base();
    expect(view(s, 'ball-1500').current).toBe(1240);
    expect(view(s, 'all-treats').current).toBe(7);
    expect(claimableCount(s)).toBe(0);
  });

  it('count cooks and 3-star cooks through rewards', () => {
    let s = base();
    s = reducer(s, { type: 'reward', reward: { coins: 10, track: { cooks: 1, threeStarCooks: 1 } } });
    s = reducer(s, { type: 'reward', reward: { track: { cooks: 1, threeStarCooks: 0 } } });
    expect(s.counters).toEqual({ cooks: 2, threeStarCooks: 1, bonusClaims: 0 });
    expect(view(s, 'first-cook').status).toBe('claimable');
    expect(view(s, 'star-chef').status).toBe('progress');
  });

  it('count bonus boxes', () => {
    const all = base({ todos: { meal: true, play: true, walk: true, care: true, deco: true } });
    expect(reducer(all, { type: 'claimBonus' }).counters.bonusClaims).toBe(1);
  });

  it('pay a mission once, only when complete', () => {
    const notYet = reducer(base(), { type: 'claimMission', id: 'first-cook' });
    expect(notYet.coins).toBe(INITIAL.coins);

    const ready = base({ counters: { cooks: 1, threeStarCooks: 0, bonusClaims: 0 } });
    const paid = reducer(ready, { type: 'claimMission', id: 'first-cook' });
    expect(paid.coins).toBe(INITIAL.coins + 100);
    expect(paid.missionsClaimed).toEqual(['first-cook']);
    expect(view(paid, 'first-cook').status).toBe('claimed');

    expect(reducer(paid, { type: 'claimMission', id: 'first-cook' })).toBe(paid);
    expect(reducer(paid, { type: 'claimMission', id: 'no-such-mission' })).toBe(paid);
  });

  it('mission EXP can level the pup up', () => {
    const s = base({ exp: 1490, counters: { cooks: 0, threeStarCooks: 3, bonusClaims: 0 } });
    const after = reducer(s, { type: 'claimMission', id: 'star-chef' });
    expect(after.level).toBe(6);
    expect(after.levelUp).toEqual({ from: 5, to: 6 });
  });

  it('old saves without mission data load cleanly, and unknown ids are dropped', () => {
    const { counters: _c, missionsClaimed: _m, ...old } = base();
    void _c;
    void _m;
    const loaded = normalizeState({ ...old, missionsClaimed: ['first-cook', 'hacked'], counters: { cooks: -3, bonusClaims: 'x' } });
    expect(loaded.counters).toEqual({ cooks: 0, threeStarCooks: 0, bonusClaims: 0 });
    expect(loaded.missionsClaimed).toEqual(['first-cook']);
    expect(normalizeState(old).counters).toEqual(INITIAL.counters);
  });

  it('describe rewards in Korean', () => {
    expect(rewardText({ coins: 500, hearts: 20 })).toBe('코인 500 · 하트 20');
    expect(rewardText({ hearts: 5, exp: 100 })).toBe('하트 5 · EXP 100');
  });
});
