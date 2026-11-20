import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, IconLink, Screen, TitlePill, TopBar } from '../components/ui';
import { BackIcon, CheckIcon, PawIcon } from '../components/icons';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useInstall } from '../components/Pwa';
import { setSoundEnabled, useSoundEnabled } from '../game/sound';
import { useToast } from '../components/Toast';
import { useAuth } from '../auth/AuthProvider';
import { useSync, type SyncPhase } from '../sync/SyncProvider';
import { fetchNickname, updateNickname } from '../lib/cloudSave';
import { useGame } from '../game/state';
import { Field } from './LoginScreen';
import { ROUTES } from '../routes';

const PHASE_TEXT: Record<SyncPhase, string> = {
  off: '이 기기에만 저장 중',
  syncing: '클라우드에 저장 중…',
  saved: '클라우드에 저장됨',
  pending: '곧 저장돼요',
  offline: '연결이 끊겨 다시 시도하는 중',
  conflict: '어느 진행을 쓸지 골라 주세요',
};

const ago = (t: number | null) => {
  if (!t) return '';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 10) return '방금';
  if (s < 60) return `${s}초 전`;
  if (s < 3600) return `${Math.round(s / 60)}분 전`;
  return new Date(t).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

type Confirm = 'signout' | 'reset' | 'delete' | null;

/** 설정 — account, cloud save status, nickname, guest linking, password, sign-out, reset. */
export default function SettingsScreen() {
  const auth = useAuth();
  const sync = useSync();
  const { dispatch } = useGame();
  const toast = useToast();
  const navigate = useNavigate();
  const install = useInstall();
  const soundOn = useSoundEnabled();
  const [nickname, setNickname] = useState('');
  const [savedNick, setSavedNick] = useState('');
  const [newPw, setNewPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [, force] = useState(0);

  const signedIn = auth.status === 'signedIn' && !!auth.user;
  const uid = auth.user?.id;

  // refresh the "n분 전" label
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 15000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!signedIn || !uid) return;
    let alive = true;
    fetchNickname(uid)
      .then((n) => {
        if (alive && n) {
          setNickname(n);
          setSavedNick(n);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [signedIn, uid]);

  const saveNick = async (e: FormEvent) => {
    e.preventDefault();
    const n = nickname.trim();
    if (!uid || !n || n === savedNick) return;
    if (n.length > 12) return toast('이름은 12자까지 쓸 수 있어요');
    setBusy(true);
    try {
      await updateNickname(uid, n);
      setSavedNick(n);
      toast('이름을 바꿨어요');
    } catch {
      toast('저장하지 못했어요. 연결을 확인해 주세요');
    } finally {
      setBusy(false);
    }
  };

  const changePw = async (e: FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) return toast('비밀번호는 8자 이상이어야 해요');
    setBusy(true);
    const r = await auth.setPassword(newPw);
    setBusy(false);
    toast(r.ok ? '비밀번호를 저장했어요' : r.error);
    if (r.ok) setNewPw('');
  };

  const startCloud = async () => {
    setBusy(true);
    const r = await auth.signInGuest();
    setBusy(false);
    toast(r.ok ? '클라우드 저장을 켰어요' : r.error);
  };

  const doSignOut = async () => {
    setConfirm(null);
    setBusy(true);
    await sync.signOutAndClear();
    setBusy(false);
    navigate(ROUTES.title, { replace: true });
  };

  const doDelete = async () => {
    setConfirm(null);
    setBusy(true);
    const ok = await sync.deleteAccount();
    setBusy(false);
    if (!ok) return toast('계정을 삭제하지 못했어요. 연결을 확인하고 다시 시도해 주세요');
    toast('계정과 모든 기록을 삭제했어요');
    navigate(ROUTES.title, { replace: true });
  };

  const doReset = () => {
    setConfirm(null);
    dispatch({ type: 'reset' });
    toast('처음부터 다시 시작해요');
    navigate(ROUTES.home);
  };

  const dotClass = sync.phase === 'saved' ? 'ok' : sync.phase === 'offline' || sync.phase === 'conflict' ? 'bad' : sync.phase === 'off' ? 'off' : 'busy';
  const accountLabel = !auth.configured ? '오프라인' : !signedIn ? '로그인 안 함' : auth.isGuest ? '게스트' : (auth.user?.email ?? '계정');

  return (
    <Screen className="settings">
      <TopBar
        left={
          <IconLink to={ROUTES.home} label="홈으로 돌아가기">
            <BackIcon />
          </IconLink>
        }
      >
        <TitlePill icon={<PawIcon />}>설정</TitlePill>
      </TopBar>

      {/* account + save status */}
      <section className="account-card card stitch" aria-labelledby="acct-h">
        <img src="/images/avatar-6m.png" alt="" />
        <div className="account-body">
          <h2 id="acct-h">{savedNick || '보호자'}</h2>
          <span className="account-kind">{accountLabel}</span>
          <span className="sync-line" aria-live="polite">
            <i className={`sync-dot ${dotClass}`} aria-hidden="true" />
            {PHASE_TEXT[sync.phase]}
            {sync.phase === 'saved' && sync.lastSavedAt ? ` · ${ago(sync.lastSavedAt)}` : ''}
          </span>
        </div>
        {signedIn && (
          <Button
            variant="paper"
            size="sm"
            disabled={sync.phase === 'syncing' || sync.phase === 'conflict'}
            onClick={async () => {
              const ok = await sync.saveNow();
              toast(ok ? '저장했어요!' : '지금은 저장할 수 없어요. 잠시 후 다시 시도해요');
            }}
          >
            지금 저장
          </Button>
        )}
      </section>

      {!auth.configured && (
        <div className="panel settings-section">
          <b>온라인 저장이 꺼져 있어요</b>
          <p>진행은 이 기기에만 저장돼요.</p>
        </div>
      )}

      {auth.configured && !signedIn && (
        <div className="panel settings-section">
          <b>클라우드에 저장하기</b>
          <p>
            {auth.guestEnabled === false
              ? '로그인하면 진행이 클라우드에 저장돼 다른 기기에서도 이어할 수 있어요. 지금까지의 진행도 함께 올라가요.'
              : '로그인하거나 게스트로 시작하면 진행이 클라우드에 저장돼요. 지금까지의 진행도 함께 올라가요.'}
          </p>
          <div className={auth.guestEnabled === false ? undefined : 'row'}>
            <Button size="lg" to={ROUTES.login}>
              로그인 · 회원가입
            </Button>
            {auth.guestEnabled !== false && (
              <Button variant="paper" size="lg" onClick={startCloud} disabled={busy}>
                게스트로 저장
              </Button>
            )}
          </div>
        </div>
      )}

      {signedIn && (
        <form className="panel settings-section" onSubmit={saveNick}>
          <b>보호자 이름</b>
          <div className="inline-field">
            <Field label="보호자 이름" type="text" value={nickname} onChange={setNickname} autoComplete="nickname" hideLabel />
            <Button size="sm" type="submit" disabled={busy || !nickname.trim() || nickname.trim() === savedNick}>
              <CheckIcon size={14} color="#4A2C17" strokeWidth={3.4} />
              저장
            </Button>
          </div>
        </form>
      )}

      {signedIn && auth.isGuest && (
        <div className="panel settings-section warn">
          <b>게스트로 플레이 중이에요</b>
          <p>이메일을 연결하면 다른 기기에서도 지금 진행을 그대로 이어갈 수 있어요. 연결하지 않고 로그아웃하면 진행이 사라져요.</p>
          <Button size="lg" to={ROUTES.login}>
            이메일 연결하기
          </Button>
        </div>
      )}

      {signedIn && !auth.isGuest && (
        <form className="panel settings-section" onSubmit={changePw}>
          <b>비밀번호 {auth.user?.email ? '변경' : '설정'}</b>
          <div className="inline-field">
            <Field label="새 비밀번호" type="password" value={newPw} onChange={setNewPw} autoComplete="new-password" hideLabel />
            <Button size="sm" type="submit" disabled={busy || newPw.length < 8}>
              저장
            </Button>
          </div>
        </form>
      )}

      <div className="panel settings-section switch-row">
        <span id="sound-label">
          <b>효과음</b>
          <small>쓰다듬기, 요리, 공놀이 소리 · 이 기기에만 적용돼요</small>
        </span>
        <button type="button" className="switch" role="switch" aria-checked={soundOn} aria-labelledby="sound-label" onClick={() => setSoundEnabled(!soundOn)}>
          <i aria-hidden="true" />
        </button>
      </div>

      {install.state !== 'installed' && install.state !== 'unsupported' && (
        <div className="panel settings-section">
          <b>앱으로 설치하기</b>
          {install.state === 'available' ? (
            <>
              <p>홈 화면에 양말이를 두고 앱처럼 열어요. 인터넷이 없어도 시작할 수 있어요.</p>
              <Button
                size="lg"
                onClick={async () => {
                  const ok = await install.install();
                  if (ok) toast('홈 화면에 양말이를 추가했어요!');
                }}
              >
                홈 화면에 추가
              </Button>
            </>
          ) : (
            <p>Safari 아래쪽의 공유 버튼을 누르고 "홈 화면에 추가"를 고르면 앱처럼 열 수 있어요.</p>
          )}
        </div>
      )}

      <div className="settings-actions">
        {signedIn && (
          <Button variant="paper" size="lg" onClick={() => setConfirm('signout')} disabled={busy}>
            로그아웃
          </Button>
        )}
        <button type="button" className="link-btn danger" onClick={() => setConfirm('reset')}>
          진행 처음부터 다시 하기
        </button>
        {signedIn && (
          <button type="button" className="link-btn danger" onClick={() => setConfirm('delete')} disabled={busy}>
            계정 삭제
          </button>
        )}
        <small className="version">양말이의 하루 v0.2 베타</small>
      </div>

      {confirm === 'signout' && (
        <ConfirmDialog
          title="로그아웃할까요?"
          body={
            auth.isGuest
              ? '게스트 진행은 이메일을 연결하지 않으면 다시 불러올 수 없어요. 그래도 로그아웃할까요?'
              : '진행은 계정에 저장돼 있어요. 다시 로그인하면 이어할 수 있어요.'
          }
          confirmLabel="로그아웃"
          danger={auth.isGuest}
          onConfirm={doSignOut}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'delete' && (
        <ConfirmDialog
          title="계정을 삭제할까요?"
          body="계정, 저장된 진행, 랭킹 기록이 모두 바로 삭제되고 되돌릴 수 없어요."
          confirmLabel="영구 삭제"
          danger
          onConfirm={doDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'reset' && (
        <ConfirmDialog
          title="처음부터 다시 할까요?"
          body={`레벨, 코인, 가구가 모두 처음 상태로 돌아가요.${signedIn ? ' 클라우드 저장도 함께 바뀌어요.' : ''} 되돌릴 수 없어요.`}
          confirmLabel="처음부터"
          danger
          onConfirm={doReset}
          onCancel={() => setConfirm(null)}
        />
      )}
    </Screen>
  );
}
