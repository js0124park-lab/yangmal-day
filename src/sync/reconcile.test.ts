import { describe, expect, it } from 'vitest';
import { decideReconcile } from './reconcile';
import type { SaveMeta } from '../game/saveMeta';

const meta = (m: Partial<SaveMeta>): SaveMeta => ({ owner: null, ownerIsGuest: false, revision: 0, localSeq: 0, syncedSeq: 0, ...m });
const ME = 'user-me';
const OTHER = 'user-other';

describe('decideReconcile — account has no cloud save yet', () => {
  it('uploads progress made while signed out', () => {
    expect(decideReconcile(meta({ owner: null, localSeq: 12 }), ME, null)).toEqual({ kind: 'upload' });
  });
  it('carries a guest’s progress into the new account', () => {
    expect(decideReconcile(meta({ owner: 'guest-1', ownerIsGuest: true, localSeq: 5 }), ME, null)).toEqual({ kind: 'upload' });
  });
  it('re-uploads its own save if the cloud row disappeared', () => {
    expect(decideReconcile(meta({ owner: ME, revision: 4 }), ME, null)).toEqual({ kind: 'upload' });
  });
  it('never hands another real account’s progress to a new account', () => {
    expect(decideReconcile(meta({ owner: OTHER, ownerIsGuest: false, localSeq: 30 }), ME, null)).toEqual({ kind: 'upload-fresh' });
  });
});

describe('decideReconcile — same account', () => {
  it('pushes offline play when the base revision still matches', () => {
    expect(decideReconcile(meta({ owner: ME, revision: 3, localSeq: 9, syncedSeq: 4 }), ME, 3)).toEqual({ kind: 'push' });
  });
  it('quietly takes the newer cloud save when nothing was played here', () => {
    expect(decideReconcile(meta({ owner: ME, revision: 3, localSeq: 4, syncedSeq: 4 }), ME, 5)).toEqual({ kind: 'adopt' });
  });
  it('asks when both this device and another device made progress', () => {
    expect(decideReconcile(meta({ owner: ME, revision: 3, localSeq: 6, syncedSeq: 4 }), ME, 5)).toEqual({ kind: 'conflict', reason: 'remote' });
  });
});

describe('decideReconcile — signing in to an existing account', () => {
  it('asks when the device has guest progress', () => {
    expect(decideReconcile(meta({ owner: 'guest-1', ownerIsGuest: true, localSeq: 2 }), ME, 7)).toEqual({ kind: 'conflict', reason: 'device' });
  });
  it('asks when the device has signed-out progress', () => {
    expect(decideReconcile(meta({ owner: null, localSeq: 1 }), ME, 7)).toEqual({ kind: 'conflict', reason: 'device' });
  });
  it('just loads the account when the device was untouched', () => {
    expect(decideReconcile(meta({ owner: null, localSeq: 0 }), ME, 7)).toEqual({ kind: 'adopt' });
  });
  it('loads the account over another real account’s leftovers without asking', () => {
    expect(decideReconcile(meta({ owner: OTHER, ownerIsGuest: false, localSeq: 50 }), ME, 7)).toEqual({ kind: 'adopt' });
  });
});
