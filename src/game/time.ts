// Game clock: a new game day starts at 05:00 Korea time ("새벽 5시에 새 할 일이 생겨요").
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const RESET_HOUR = 5;

/** 'YYYY-MM-DD' of the game day that contains `now`. */
export function gameDay(now = Date.now()): string {
  return new Date(now + KST_OFFSET_MS - RESET_HOUR * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Per-hour stat drift while the player is away or idle. Stamina recovers with rest. */
export const DRIFT_PER_HOUR = { fullness: -5, joy: -3, clean: -2, stamina: 8 } as const;

/** Never apply more than this much absence at once, so a long break is not a disaster. */
export const MAX_DRIFT_HOURS = 48;
