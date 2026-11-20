// What to do with this device's save when user `uid` signs in, given what the cloud holds.
// Pure, so every case is unit-tested (src/sync/reconcile.test.ts).
import { hasUnsyncedPlayerChanges, type SaveMeta } from '../game/saveMeta';

export type ReconcileDecision =
  /** no cloud save: upload this device's progress as the account's first save */
  | { kind: 'upload' }
  /** no cloud save, but the local save belongs to another account: start this account fresh */
  | { kind: 'upload-fresh' }
  /** same base revision: just push anything played offline */
  | { kind: 'push' }
  /** take the cloud save */
  | { kind: 'adopt' }
  /** both sides changed: ask the player */
  | { kind: 'conflict'; reason: 'device' | 'remote' };

/** `cloudRevision` is null when the account has no cloud save yet. */
export function decideReconcile(meta: SaveMeta, uid: string, cloudRevision: number | null): ReconcileDecision {
  const mine = meta.owner === uid;
  // progress made while signed out or as a guest may be carried into this account
  const claimable = meta.owner === null || meta.ownerIsGuest;

  if (cloudRevision === null) return mine || claimable ? { kind: 'upload' } : { kind: 'upload-fresh' };

  if (mine) {
    if (cloudRevision === meta.revision) return { kind: 'push' };
    return hasUnsyncedPlayerChanges(meta) ? { kind: 'conflict', reason: 'remote' } : { kind: 'adopt' };
  }
  if (claimable && meta.localSeq > 0) return { kind: 'conflict', reason: 'device' };
  return { kind: 'adopt' };
}
