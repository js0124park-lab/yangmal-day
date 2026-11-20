// Supabase client. Without env vars the app runs fully offline (local save only).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient<Database> | null =
  url && key
    ? createClient<Database>(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true, // email confirmation / magic link / password recovery links
          storageKey: 'yangmal-auth',
        },
      })
    : null;

export const isCloudConfigured = supabase !== null;

/**
 * Whether the project allows anonymous (guest) sign-ins, read from the public Auth settings endpoint.
 * null = unknown (offline or not configured).
 */
export async function fetchGuestSignInEnabled(): Promise<boolean | null> {
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!res.ok) return null;
    const body = (await res.json()) as { external?: { anonymous_users?: boolean } };
    return typeof body.external?.anonymous_users === 'boolean' ? body.external.anonymous_users : null;
  } catch {
    return null;
  }
}

/** Where Supabase email links send the player back to. */
export const authRedirectUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}login`;
