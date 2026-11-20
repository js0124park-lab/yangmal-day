// Auth state and actions. Guests are Supabase anonymous users; linking an email keeps the same user id (and save).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { authRedirectUrl, fetchGuestSignInEnabled, isCloudConfigured, supabase } from '../lib/supabase';
import { authErrorMessage } from '../lib/authErrors';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

/** `code` is the Supabase error code when there is one, so screens can offer a next step (e.g. resend). */
type Result = { ok: true; info?: string } | { ok: false; error: string; code?: string };

interface AuthApi {
  configured: boolean;
  status: AuthStatus;
  user: User | null;
  isGuest: boolean;
  /** true right after opening a password recovery link */
  recovering: boolean;
  /** whether the project allows guest (anonymous) sign-in; null until known or when offline */
  guestEnabled: boolean | null;
  signInGuest: () => Promise<Result>;
  signIn: (email: string, password: string) => Promise<Result>;
  signUp: (email: string, password: string) => Promise<Result>;
  sendLoginLink: (email: string) => Promise<Result>;
  resendConfirmation: (email: string) => Promise<Result>;
  sendPasswordReset: (email: string) => Promise<Result>;
  setPassword: (password: string) => Promise<Result>;
  linkEmail: (email: string) => Promise<Result>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthApi | null>(null);

const fail = (e: unknown): Result => ({
  ok: false,
  error: authErrorMessage(e),
  code: typeof e === 'object' && e && 'code' in e ? String((e as { code?: unknown }).code ?? '') || undefined : undefined,
});
const notConfigured: Result = { ok: false, error: '온라인 저장이 아직 설정되지 않았어요.' };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(isCloudConfigured ? 'loading' : 'signedOut');
  const [recovering, setRecovering] = useState(false);
  const [guestEnabled, setGuestEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    fetchGuestSignInEnabled().then((v) => alive && setGuestEnabled(v));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setStatus(data.session ? 'signedIn' : 'signedOut');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setStatus(next ? 'signedIn' : 'signedOut');
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;

  const signInGuest = useCallback(async (): Promise<Result> => {
    if (!supabase) return notConfigured;
    const { error } = await supabase.auth.signInAnonymously();
    return error ? fail(error) : { ok: true };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<Result> => {
    if (!supabase) return notConfigured;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? fail(error) : { ok: true };
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<Result> => {
    if (!supabase) return notConfigured;
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: authRedirectUrl() } });
    if (error) return fail(error);
    // with email confirmation on, there is no session until the link is opened
    if (!data.session) return { ok: true, info: '인증 메일을 보냈어요. 메일의 링크를 누르면 가입이 끝나요.' };
    return { ok: true };
  }, []);

  const sendLoginLink = useCallback(async (email: string): Promise<Result> => {
    if (!supabase) return notConfigured;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: authRedirectUrl() } });
    return error ? fail(error) : { ok: true, info: '로그인 링크를 보냈어요. 메일의 링크를 눌러 주세요.' };
  }, []);

  const resendConfirmation = useCallback(async (email: string): Promise<Result> => {
    if (!supabase) return notConfigured;
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: authRedirectUrl() } });
    return error ? fail(error) : { ok: true, info: '인증 메일을 다시 보냈어요. 메일함(스팸함 포함)을 확인해 주세요.' };
  }, []);

  const sendPasswordReset = useCallback(async (email: string): Promise<Result> => {
    if (!supabase) return notConfigured;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
    return error ? fail(error) : { ok: true, info: '비밀번호 재설정 메일을 보냈어요.' };
  }, []);

  const setPassword = useCallback(async (password: string): Promise<Result> => {
    if (!supabase) return notConfigured;
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return fail(error);
    setRecovering(false);
    return { ok: true, info: '비밀번호를 저장했어요.' };
  }, []);

  /** Guest → email account. Same user id, so the cloud save carries over once the email is confirmed. */
  const linkEmail = useCallback(async (email: string): Promise<Result> => {
    if (!supabase) return notConfigured;
    const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: authRedirectUrl() });
    return error ? fail(error) : { ok: true, info: '확인 메일을 보냈어요. 링크를 누르면 계정 연결이 끝나요.' };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const api = useMemo<AuthApi>(
    () => ({
      configured: isCloudConfigured,
      status,
      user,
      isGuest: !!user?.is_anonymous,
      recovering,
      guestEnabled,
      signInGuest,
      signIn,
      signUp,
      sendLoginLink,
      resendConfirmation,
      sendPasswordReset,
      setPassword,
      linkEmail,
      signOut,
    }),
    [status, user, recovering, guestEnabled, signInGuest, signIn, signUp, sendLoginLink, resendConfirmation, sendPasswordReset, setPassword, linkEmail, signOut],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
