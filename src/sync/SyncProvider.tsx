// Cloud sync: local-first play, debounced cloud saves, retry with backoff, multi-device conflict handling.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../components/Toast';
import { ConflictError, deleteMyAccount, fetchSave, pushSave, type CloudSave } from '../lib/cloudSave';
import { INITIAL, clearLocalSave, normalizeState, useGame, type GameState } from '../game/state';
import { hasUnsyncedPlayerChanges, readMeta, resetMeta, writeMeta } from '../game/saveMeta';
import { ConflictDialog } from './ConflictDialog';
import { decideReconcile } from './reconcile';

export type SyncPhase = 'off' | 'syncing' | 'saved' | 'pending' | 'offline' | 'conflict';

export interface Conflict {
  cloud: CloudSave;
  cloudState: GameState;
  /** device = progress made before signing in; remote = another device saved meanwhile */
  reason: 'device' | 'remote';
}

interface SyncApi {
  phase: SyncPhase;
  lastSavedAt: number | null;
  saveNow: () => Promise<boolean>;
  /** Saves what it can, signs out and clears this device. */
  signOutAndClear: () => Promise<void>;
  /** Deletes the account and all its cloud data, then clears this device. Resolves false if the server refused. */
  deleteAccount: () => Promise<boolean>;
}

const SyncContext = createContext<SyncApi | null>(null);

const DEBOUNCE_MS = 1500;
const IDLE_SAVE_MS = 5 * 60 * 1000;
const RETRY_MIN_MS = 2000;
const RETRY_MAX_MS = 60000;

export function SyncProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useGame();
  const auth = useAuth();
  const toast = useToast();
  const [phase, setPhase] = useState<SyncPhase>('off');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [conflict, setConflict] = useState<Conflict | null>(null);

  const uid = auth.status === 'signedIn' ? (auth.user?.id ?? null) : null;
  const isGuest = auth.isGuest;

  // refs so async work always sees the latest values
  const stateRef = useRef(state);
  stateRef.current = state;
  const uidRef = useRef(uid);
  uidRef.current = uid;
  const guestRef = useRef(isGuest);
  guestRef.current = isGuest;
  const readyFor = useRef<string | null>(null); // uid whose reconciliation finished
  const inflight = useRef<Promise<boolean> | null>(null);
  const again = useRef(false);
  const lastPushed = useRef<string>('');
  const debounce = useRef<number>();
  const retry = useRef<number>();
  const retryDelay = useRef(RETRY_MIN_MS);
  const conflictRef = useRef<Conflict | null>(null);
  conflictRef.current = conflict;

  const adopt = useCallback(
    (cloud: CloudSave, owner: string) => {
      const next = normalizeState(cloud.state);
      dispatch({ type: 'load', state: next, now: Date.now() });
      writeMeta({ owner, ownerIsGuest: guestRef.current, revision: cloud.revision, localSeq: 0, syncedSeq: 0 });
      lastPushed.current = '';
    },
    [dispatch],
  );

  const openConflict = useCallback((cloud: CloudSave, reason: Conflict['reason']) => {
    setConflict({ cloud, cloudState: normalizeState(cloud.state), reason });
    setPhase('conflict');
  }, []);

  /** Push the current state. Resolves true when the cloud has it. */
  const push = useCallback((): Promise<boolean> => {
    const me = uidRef.current;
    if (!me || readyFor.current !== me || conflictRef.current) return Promise.resolve(false);
    if (inflight.current) {
      again.current = true;
      return inflight.current;
    }
    const snapshot = stateRef.current;
    const json = JSON.stringify(snapshot);
    if (json === lastPushed.current) return Promise.resolve(true);

    const meta = readMeta();
    const seqAtStart = meta.localSeq;
    setPhase('syncing');

    const run = (async () => {
      try {
        const revision = await pushSave(snapshot, meta.revision);
        if (uidRef.current !== me) return false; // signed out meanwhile
        writeMeta({ owner: me, ownerIsGuest: guestRef.current, revision, syncedSeq: seqAtStart });
        lastPushed.current = json;
        retryDelay.current = RETRY_MIN_MS;
        setLastSavedAt(Date.now());
        setPhase(hasUnsyncedPlayerChanges() ? 'pending' : 'saved');
        return true;
      } catch (err) {
        if (err instanceof ConflictError) {
          try {
            const cloud = await fetchSave(me);
            if (!cloud) {
              // the row vanished: start over from revision 0 on the next push
              writeMeta({ revision: 0 });
              again.current = true;
              return false;
            }
            if (hasUnsyncedPlayerChanges()) openConflict(cloud, 'remote');
            else {
              adopt(cloud, me);
              toast('다른 기기의 진행을 불러왔어요');
            }
          } catch {
            setPhase('offline');
          }
          return false;
        }
        setPhase('offline');
        window.clearTimeout(retry.current);
        retry.current = window.setTimeout(() => void push(), retryDelay.current);
        retryDelay.current = Math.min(RETRY_MAX_MS, retryDelay.current * 2);
        return false;
      } finally {
        inflight.current = null;
        if (again.current) {
          again.current = false;
          window.clearTimeout(debounce.current);
          debounce.current = window.setTimeout(() => void push(), 300);
        }
      }
    })();
    inflight.current = run;
    return run;
  }, [adopt, openConflict, toast]);

  // ---------- reconcile when a user signs in (or the signed-in user changes) ----------
  useEffect(() => {
    readyFor.current = null;
    setConflict(null);
    if (!uid) {
      setPhase('off');
      return;
    }
    let cancelled = false;
    let attempt = 0;
    let timer: number | undefined;

    const reconcile = async () => {
      setPhase('syncing');
      let cloud: CloudSave | null;
      try {
        cloud = await fetchSave(uid);
      } catch {
        if (cancelled) return;
        setPhase('offline');
        timer = window.setTimeout(reconcile, Math.min(RETRY_MAX_MS, RETRY_MIN_MS * 2 ** attempt++));
        return;
      }
      if (cancelled) return;

      const decision = decideReconcile(readMeta(), uid, cloud ? cloud.revision : null);

      // NOTE: after a 'load' dispatch, stateRef still holds the old state until React re-renders.
      // Never push right after loading — the debounced save effect pushes the loaded state once it lands.
      switch (decision.kind) {
        case 'upload':
        case 'upload-fresh': {
          const fresh = decision.kind === 'upload-fresh';
          if (fresh) dispatch({ type: 'load', state: INITIAL, now: Date.now() }); // left over from another account
          writeMeta({ owner: uid, ownerIsGuest: guestRef.current, revision: 0, syncedSeq: 0, localSeq: 0 });
          readyFor.current = uid;
          lastPushed.current = '';
          if (!fresh) void push(); // first cloud save of this device's progress
          return;
        }
        case 'push':
          readyFor.current = uid;
          setLastSavedAt(cloud ? Date.parse(cloud.updatedAt) || Date.now() : null);
          setPhase('saved');
          void push(); // same base: send anything played offline
          return;
        case 'conflict':
          readyFor.current = uid;
          if (cloud) openConflict(cloud, decision.reason);
          return;
        case 'adopt':
          readyFor.current = uid;
          if (cloud) {
            adopt(cloud, uid); // the save effect pushes the loaded state after it renders
            setLastSavedAt(Date.parse(cloud.updatedAt) || Date.now());
          }
          setPhase('saved');
          return;
      }
    };

    void reconcile();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [uid, adopt, openConflict, push, dispatch]);

  // ---------- debounced save on every change ----------
  // Player actions save after 1.5s. Changes that are only time passing (stat drift, loading a save) wait 5 minutes:
  // saving them at once would bump the cloud revision with no real progress and make other devices see conflicts.
  // Hiding the tab, "지금 저장" and the next player action still save them right away.
  useEffect(() => {
    if (!uid || readyFor.current !== uid || conflict) return;
    window.clearTimeout(debounce.current);
    const playerChange = hasUnsyncedPlayerChanges();
    if (playerChange) setPhase((p) => (p === 'syncing' || p === 'offline' ? p : 'pending'));
    debounce.current = window.setTimeout(() => void push(), playerChange ? DEBOUNCE_MS : IDLE_SAVE_MS);
  }, [state, uid, conflict, push]);

  // ---------- leaving / returning to the tab ----------
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        window.clearTimeout(debounce.current);
        void push();
      }
    };
    const onShow = async () => {
      const me = uidRef.current;
      if (document.visibilityState !== 'visible' || !me || readyFor.current !== me || inflight.current || conflictRef.current) return;
      if (hasUnsyncedPlayerChanges()) return;
      try {
        const cloud = await fetchSave(me);
        if (cloud && cloud.revision > readMeta().revision && !hasUnsyncedPlayerChanges()) {
          adopt(cloud, me);
          toast('다른 기기의 진행을 불러왔어요');
        }
      } catch {
        /* offline: the next save will retry */
      }
    };
    const onOnline = () => {
      retryDelay.current = RETRY_MIN_MS;
      void push();
    };
    document.addEventListener('visibilitychange', onHide);
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      document.removeEventListener('visibilitychange', onShow);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('online', onOnline);
    };
  }, [push, adopt, toast]);

  useEffect(
    () => () => {
      window.clearTimeout(debounce.current);
      window.clearTimeout(retry.current);
    },
    [],
  );

  const resolve = useCallback(
    (choice: 'device' | 'cloud') => {
      const c = conflictRef.current;
      const me = uidRef.current;
      if (!c || !me) return;
      setConflict(null);
      conflictRef.current = null;
      if (choice === 'cloud') {
        adopt(c.cloud, me);
        setPhase('saved');
        toast('클라우드 진행을 불러왔어요');
      } else {
        // overwrite the cloud with this device's progress (state was not reloaded, so pushing now is safe)
        writeMeta({ owner: me, ownerIsGuest: guestRef.current, revision: c.cloud.revision });
        lastPushed.current = '';
        void push().then((ok) => {
          if (ok) toast('이 기기의 진행으로 저장했어요');
        });
      }
    },
    [adopt, push, toast],
  );

  const saveNow = useCallback(async () => {
    window.clearTimeout(debounce.current);
    lastPushed.current = '';
    return push();
  }, [push]);

  const signOutAndClear = useCallback(async () => {
    window.clearTimeout(debounce.current);
    if (uidRef.current && readyFor.current === uidRef.current && !conflictRef.current) {
      // best effort, but never hang the sign-out on a bad connection
      await Promise.race([push(), new Promise((r) => window.setTimeout(r, 4000))]);
    }
    readyFor.current = null;
    await auth.signOut();
    clearLocalSave();
    resetMeta();
    dispatch({ type: 'load', state: INITIAL, now: Date.now() });
    // the reset itself is not player progress
    writeMeta({ localSeq: 0, syncedSeq: 0 });
  }, [auth, dispatch, push]);

  const deleteAccount = useCallback(async () => {
    window.clearTimeout(debounce.current);
    window.clearTimeout(retry.current);
    readyFor.current = null; // stop saving: there is nothing to save to any more
    try {
      await deleteMyAccount();
    } catch {
      readyFor.current = uidRef.current;
      return false;
    }
    await auth.signOut(); // the session is already invalid; this clears it locally
    clearLocalSave();
    resetMeta();
    dispatch({ type: 'load', state: INITIAL, now: Date.now() });
    writeMeta({ localSeq: 0, syncedSeq: 0 });
    return true;
  }, [auth, dispatch]);

  const api = useMemo(
    () => ({ phase, lastSavedAt, saveNow, signOutAndClear, deleteAccount }),
    [phase, lastSavedAt, saveNow, signOutAndClear, deleteAccount],
  );

  return (
    <SyncContext.Provider value={api}>
      {children}
      {conflict && <ConflictDialog conflict={conflict} device={state} onChoose={resolve} />}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside <SyncProvider>');
  return ctx;
}
