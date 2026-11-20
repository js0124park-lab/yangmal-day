import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Meter, Screen } from '../components/ui';
import { PawIcon } from '../components/icons';
import { useToast } from '../components/Toast';
import { useAuth } from '../auth/AuthProvider';
import { ROUTES } from '../routes';

const GUEST_TIMEOUT_MS = 6000;

/** P01 타이틀 — start as a guest (cloud-saved anonymous user) or log in to continue. */
export default function TitleScreen() {
  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  const signedIn = auth.status === 'signedIn';
  const account = signedIn && !auth.isGuest;

  const start = async () => {
    if (starting) return;
    if (!navigator.onLine && auth.status === 'signedOut') {
      toast('오프라인이에요. 이 기기에 먼저 저장하고, 연결되면 설정에서 로그인할 수 있어요');
      navigate(ROUTES.home);
      return;
    }
    // guest sign-in turned off on the project: play on this device without nagging; settings offers login
    if (auth.configured && auth.status === 'signedOut' && auth.guestEnabled !== false) {
      setStarting(true);
      // never keep the player waiting on a slow network: play locally and sync later
      const r = await Promise.race([
        auth.signInGuest(),
        new Promise<{ ok: false; error: string }>((res) =>
          window.setTimeout(() => res({ ok: false, error: '연결이 느려서 이 기기에 먼저 저장할게요' }), GUEST_TIMEOUT_MS),
        ),
      ]);
      setStarting(false);
      if (!r.ok) toast(r.error);
    }
    navigate(ROUTES.home);
  };

  return (
    <Screen className="title">
      <div className="title-art">
        <img className="logo" src="/images/logo.png" alt="양말이의 하루 Yangmal's Day 로고" />
        <img className="hero" src="/images/title-hero.png" alt="빨간 리드줄을 달고 신나게 달려오는 양말이" />
      </div>

      <div className="title-body">
        <p className="tagline">
          "오늘도, 양말이와 함께하는
          <br />
          소소하고 특별한 하루!"
        </p>

        <div className="loading">
          <Meter value={100} label="불러오기" valueText={auth.status === 'loading' ? '불러오는 중' : '준비 완료'} />
          <span aria-live="polite">
            {auth.status === 'loading'
              ? '양말이를 깨우는 중이에요'
              : account
                ? `${auth.user?.email ?? ''} 님, 어서 오세요`
                : '양말이가 문 앞에서 기다리고 있어요'}
          </span>
        </div>

        <div className="title-actions">
          <Button onClick={start} disabled={starting || auth.status === 'loading'}>
            <PawIcon size={22} color="#4A2C17" />
            {starting ? '문 여는 중…' : signedIn ? '이어서 시작하기' : '터치해서 시작하기'}
          </Button>
          {account ? (
            <Button variant="paper" to={ROUTES.settings}>
              계정 · 설정
            </Button>
          ) : (
            <Button variant="paper" to={ROUTES.login}>
              {auth.isGuest ? '계정 연결 · 로그인' : '로그인하고 이어하기'}
            </Button>
          )}
        </div>

        <div className="title-foot">
          <span>v0.2 베타</span>
          <a href="#terms">이용약관</a>
          <a href="#privacy">개인정보처리방침</a>
        </div>
      </div>
    </Screen>
  );
}
