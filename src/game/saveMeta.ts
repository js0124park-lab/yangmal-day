// Sync bookkeeping for the local save, kept apart from the game state itself.
//  owner       – auth user id the local state belongs to (null = never synced / offline guest)
//  revision    – cloud revision the local state was last synced with (0 = never saved)
//  localSeq    – count of player actions applied locally (time ticks excluded)
//  syncedSeq   – localSeq value at the last successful sync
// localSeq > syncedSeq means the player changed something the cloud has not seen.

export interface SaveMeta {
  owner: string | null;
  ownerIsGuest: boolean;
  revision: number;
  localSeq: number;
  syncedSeq: number;
}

const KEY = 'yangmal-sync-meta';
const EMPTY: SaveMeta = { owner: null, ownerIsGuest: false, revision: 0, localSeq: 0, syncedSeq: 0 };

let cache: SaveMeta | null = null;

export function readMeta(): SaveMeta {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<SaveMeta>) } : { ...EMPTY };
  } catch {
    cache = { ...EMPTY };
  }
  return cache;
}

export function writeMeta(patch: Partial<SaveMeta>): SaveMeta {
  cache = { ...readMeta(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable */
  }
  return cache;
}

export function resetMeta(): SaveMeta {
  return writeMeta({ ...EMPTY });
}

/** Called for every player action. */
export function bumpLocalSeq() {
  writeMeta({ localSeq: readMeta().localSeq + 1 });
}

export const hasUnsyncedPlayerChanges = (m = readMeta()) => m.localSeq > m.syncedSeq;
