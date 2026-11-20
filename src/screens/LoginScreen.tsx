import { useEffect, useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, IconLink, Screen, TitlePill, TopBar } from '../components/ui';
import { BackIcon, PawIcon } from '../components/icons';
import { useAuth } from '../auth/AuthProvider';
import { useSync } from '../sync/SyncProvider';
import { useToast } from '../components/Toast';
import { ROUTES } from '../routes';
import { asset } from '../lib/asset';

type Mode = 'signin' | 'signup' | 'link' | 'reset' | 'newpassword';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  hint,
  invalid,
  hideLabel,
}: {
  label: string;
  type: 'email' | 'password' | 'text';
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  hint?: string;
  invalid?: boolean;
  /** keep the label for screen readers only (when a visible heading already names the field) */
  hideLabel?: boolean;
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  return (
    <div className="field">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : undefined}>
        {label}
      </label>
      <div className="field-box">
        <input
          id={id}
          type={isPw && show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          inputMode={type === 'email' ? 'email' : undefined}
          spellCheck={false}
          autoCapitalize="none"
        />
        {isPw && (
          <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)} aria-pressed={show}>
            {show ? '숨기기' : '보기'}
          </button>
        )}
      </div>
      {hint && (
        <small id={`${id}-hint`} className="field-hint">
          {hint}
        </small>
      )}
    </div>
  );
}

const TITLES: Record<Mode, string> = {
  signin: '로그인',
  signup: '회원가입',
  link: '계정 연결',
  reset: '비밀번호 찾기',
  newpassword: '새 비밀번호',
};

/** Login, sign-up, login link, password reset, and (for guests) linking an email. */
export default function LoginScreen() {
  const auth = useAuth();
  const sync = useSync();
  const toast = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(auth.isGuest ? 'link' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [waitingSignIn, setWaitingSignIn] = useState(false);
  /** set after sign-up, or when login says the email is not confirmed yet */
  const [canResend, setCanResend] = useState(false);

  // opened from a password-recovery email
  useEffect(() => {
    if (auth.recovering) setMode('newpassword');
  }, [auth.recovering]);

  // finished signing in (password, or an email link that landed here)
  useEffect(() => {
    if (waitingSignIn && auth.status === 'signedIn' && !auth.isGuest) {
      toast('로그인했어요!');
      navigate(ROUTES.home, { replace: true });
    }
  }, [waitingSignIn, auth.status, auth.isGuest, navigate, toast]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setMsg(null);
    setPassword('');
    setCanResend(false);
  };

  const resend = async () => {
    if (!emailOk) return setMsg({ kind: 'error', text: '이메일 주소를 확인해 주세요.' });
    setBusy(true);
    const r = await auth.resendConfirmation(email.trim());
    setBusy(false);
    setMsg(r.ok ? { kind: 'info', text: r.info ?? '' } : { kind: 'error', text: r.error });
  };

  const emailOk = EMAIL_RE.test(email.trim());
  const pwOk = password.length >= 8;
  const needsPw = mode === 'signin' || mode === 'signup' || mode === 'newpassword';
  const needsEmail = mode !== 'newpassword';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (needsEmail && !emailOk) return setMsg({ kind: 'error', text: '이메일 주소를 확인해 주세요.' });
    if (needsPw && mode !== 'signin' && !pwOk) return setMsg({ kind: 'error', text: '비밀번호는 8자 이상이어야 해요.' });
    if (mode === 'signin' && !password) return setMsg({ kind: 'error', text: '비밀번호를 입력해 주세요.' });

    setBusy(true);
    setMsg(null);
    const addr = email.trim();
    const r =
      mode === 'signin'
        ? await auth.signIn(addr, password)
        : mode === 'signup'
          ? await auth.signUp(addr, password)
          : mode === 'link'
            ? await auth.linkEmail(addr)
            : mode === 'reset'
              ? await auth.sendPasswordReset(addr)
              : await auth.setPassword(password);
    setBusy(false);

    if (!r.ok) {
      if (r.code === 'email_not_confirmed') setCanResend(true);
      return setMsg({ kind: 'error', text: r.error });
    }
    if (r.info) setMsg({ kind: 'info', text: r.info });
    if (mode === 'signup' && r.info) {
      // confirmation pending: the next step is logging in after clicking the link
      setCanResend(true);
      setMode('signin');
      setPassword('');
    }
    if (mode === 'signin' || (mode === 'signup' && !r.info)) setWaitingSignIn(true);
    if (mode === 'newpassword') {
      toast('비밀번호를 바꿨어요');
      navigate(ROUTES.home, { replace: true });
    }
  };

  const loginLink = async () => {
    if (!emailOk) return setMsg({ kind: 'error', text: '로그인 링크를 받을 이메일을 입력해 주세요.' });
    setBusy(true);
    const r = await auth.sendLoginLink(email.trim());
    setBusy(false);
    setMsg(r.ok ? { kind: 'info', text: r.info ?? '' } : { kind: 'error', text: r.error });
    if (r.ok) setWaitingSignIn(true);
  };

  const playAsGuest = async () => {
    if (auth.configured && auth.status === 'signedOut' && auth.guestEnabled !== false) {
      setBusy(true);
      const r = await auth.signInGuest();
      setBusy(false);
      if (!r.ok) toast(r.error);
    }
    navigate(ROUTES.home);
  };

  // already signed in with a real account (e.g. came back from a confirmation link)
  const signedInAccount = auth.status === 'signedIn' && !auth.isGuest && mode !== 'newpassword';

  if (!auth.configured) {
    return (
      <Screen className="login">
        <LoginTop />
        <div className="panel stitch login-note">
          <b>온라인 저장이 꺼져 있어요</b>
          <p>지금은 이 기기에만 저장돼요. 관리자가 Supabase 연결을 설정하면 로그인과 클라우드 저장을 쓸 수 있어요.</p>
        </div>
        <Button size="xl" to={ROUTES.home} style={{ marginTop: 'auto' }}>
          <PawIcon size={26} color="#4A2C17" />
          이 기기에서 계속하기
        </Button>
      </Screen>
    );
  }

  if (signedInAccount) {
    return (
      <Screen className="login">
        <LoginTop />
        <div className="panel stitch login-note">
          <b>로그인되어 있어요</b>
          <p>{auth.user?.email}</p>
        </div>
        <div className="login-actions">
          <Button size="xl" to={ROUTES.home}>
            <PawIcon size={26} color="#4A2C17" />
            양말이 만나러 가기
          </Button>
          <Button
            variant="paper"
            size="lg"
            onClick={async () => {
              await sync.signOutAndClear();
              switchMode('signin');
            }}
          >
            다른 계정으로 로그인
          </Button>
        </div>
      </Screen>
    );
  }

  const tabs: Mode[] = auth.isGuest ? ['link', 'signin'] : ['signin', 'signup'];

  return (
    <Screen className="login">
      <LoginTop title={TITLES[mode]} />

      <div className="login-hero">
        <img src={asset('images/pose-sit.png')} alt="" />
        <p className="hand">
          {mode === 'link'
            ? '계정을 연결하면 지금 진행을 그대로 이어가요!'
            : mode === 'signup'
              ? '어느 기기에서든 양말이를 만나요!'
              : mode === 'reset'
                ? '메일로 재설정 링크를 보내 드려요'
                : mode === 'newpassword'
                  ? '새 비밀번호를 정해 주세요'
                  : '다시 만나서 반가워요 멍!'}
        </p>
      </div>

      {(mode === 'signin' || mode === 'signup' || mode === 'link') && (
        <div className="segmented" role="tablist" aria-label="로그인 방식">
          {tabs.map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => switchMode(m)}>
              {m === 'link' ? '게스트 계정 연결' : m === 'signin' ? (auth.isGuest ? '기존 계정 로그인' : '로그인') : '회원가입'}
            </button>
          ))}
        </div>
      )}

      <form className="login-form" onSubmit={submit} noValidate>
        {needsEmail && (
          <Field label="이메일" type="email" value={email} onChange={setEmail} autoComplete="email" invalid={!!email && !emailOk} />
        )}
        {needsPw && (
          <Field
            label={mode === 'newpassword' ? '새 비밀번호' : '비밀번호'}
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            hint={mode === 'signin' ? undefined : '8자 이상, 영문과 숫자를 섞으면 안전해요'}
          />
        )}
        {mode === 'link' && <p className="field-hint">메일의 확인 링크를 누르면 연결이 끝나요. 그다음 설정에서 비밀번호를 정할 수 있어요.</p>}
        {mode === 'signin' && auth.isGuest && <p className="field-hint">기존 계정으로 로그인하면, 지금 게스트 진행과 계정 진행 중 하나를 고르게 돼요.</p>}

        <p className={msg ? `form-msg ${msg.kind}` : 'form-msg'} role={msg?.kind === 'error' ? 'alert' : 'status'}>
          {msg?.text}
        </p>

        <Button size="xl" type="submit" className="submit" disabled={busy}>
          {busy ? '잠시만요…' : mode === 'signin' ? '로그인' : mode === 'signup' ? '가입하기' : mode === 'link' ? '확인 메일 받기' : mode === 'reset' ? '재설정 메일 받기' : '비밀번호 저장'}
        </Button>
      </form>

      <div className="login-links">
        {canResend && (
          <button type="button" className="link-btn" onClick={resend} disabled={busy}>
            인증 메일 다시 보내기
          </button>
        )}
        {mode === 'signin' && (
          <>
            <button type="button" className="link-btn" onClick={() => switchMode('reset')}>
              비밀번호를 잊었어요
            </button>
            <button type="button" className="link-btn" onClick={loginLink} disabled={busy}>
              메일로 로그인 링크 받기
            </button>
          </>
        )}
        {mode === 'reset' && (
          <button type="button" className="link-btn" onClick={() => switchMode('signin')}>
            로그인으로 돌아가기
          </button>
        )}
        {auth.status === 'signedOut' && (
          <button type="button" className="link-btn" onClick={playAsGuest} disabled={busy}>
            게스트로 시작하기
          </button>
        )}
      </div>
    </Screen>
  );
}

function LoginTop({ title = '로그인' }: { title?: string }) {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';
  return (
    <TopBar
      left={
        <IconLink to={signedIn ? ROUTES.settings : ROUTES.title} label={signedIn ? '설정으로 돌아가기' : '타이틀로 돌아가기'}>
          <BackIcon />
        </IconLink>
      }
    >
      <TitlePill icon={<PawIcon />}>{title}</TitlePill>
    </TopBar>
  );
}
