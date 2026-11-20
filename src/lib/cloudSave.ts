// Cloud save API on top of the game_saves table and the save_game() RPC.
import type { Json } from './database.types';
import { supabase } from './supabase';

export const SCHEMA_VERSION = 1;

export interface CloudSave {
  state: unknown;
  revision: number;
  updatedAt: string;
}

/** Another device saved since our last sync. */
export class ConflictError extends Error {
  constructor() {
    super('revision_conflict');
    this.name = 'ConflictError';
  }
}

/** Network or server trouble that is worth retrying. */
export class TransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransientError';
  }
}

function client() {
  if (!supabase) throw new Error('cloud_not_configured');
  return supabase;
}

export async function fetchSave(userId: string): Promise<CloudSave | null> {
  const { data, error } = await client()
    .from('game_saves')
    .select('state, revision, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new TransientError(error.message);
  return data ? { state: data.state, revision: data.revision, updatedAt: data.updated_at } : null;
}

/** Saves and returns the new revision. Throws ConflictError when baseRevision is stale. */
export async function pushSave(state: unknown, baseRevision: number): Promise<number> {
  const { data, error } = await client().rpc('save_game', {
    p_state: state as Json,
    p_base_revision: baseRevision,
    p_schema_version: SCHEMA_VERSION,
  });
  if (error) {
    if (error.message.includes('revision_conflict')) throw new ConflictError();
    throw new TransientError(error.message);
  }
  return data;
}

export async function fetchNickname(userId: string): Promise<string | null> {
  const { data, error } = await client().from('profiles').select('nickname').eq('id', userId).maybeSingle();
  if (error) throw new TransientError(error.message);
  return data?.nickname ?? null;
}

export async function updateNickname(userId: string, nickname: string): Promise<void> {
  const { error } = await client().from('profiles').update({ nickname }).eq('id', userId);
  if (error) throw new TransientError(error.message);
}

/** Deletes the signed-in user and everything they own (profile, save, scores). */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await client().rpc('delete_my_account');
  if (error) throw new TransientError(error.message);
}

// ---------- weekly ball ranking ----------

export interface BallRank {
  best: number;
  rank: number;
  players: number;
}

export interface RankRow {
  rank: number;
  nickname: string;
  score: number;
  isMe: boolean;
}

/** Records a finished round (the server keeps this week's best) and returns the player's rank. */
export async function submitBallScore(score: number): Promise<BallRank | null> {
  const { data, error } = await client().rpc('submit_ball_score', { p_score: Math.max(0, Math.min(20000, Math.round(score))) });
  if (error) throw new TransientError(error.message);
  return data?.[0] ?? null;
}

export async function fetchBallRanking(limit = 10): Promise<RankRow[]> {
  const { data, error } = await client().rpc('get_ball_ranking', { p_limit: limit });
  if (error) throw new TransientError(error.message);
  return (data ?? []).map((r) => ({ rank: r.rank, nickname: r.nickname, score: r.score, isMe: r.is_me }));
}
