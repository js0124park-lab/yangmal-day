import { useRef, useState } from 'react';
import { Button, Chip, IconLink, Screen, Stage, TitlePill, TopBar } from '../components/ui';
import { Floaters } from '../components/Floaters';
import { BallIcon, ClockIcon, PauseIcon, PawIcon, ThrowUpIcon } from '../components/icons';
import { buzz, useFloaters, useFrame } from '../game/hooks';
import { playSound } from '../game/sound';
import { fmt, useGame } from '../game/state';
import { ROUTES } from '../routes';
import { useAuth } from '../auth/AuthProvider';
import { submitBallScore, type BallRank } from '../lib/cloudSave';
import { RankingDialog } from '../components/RankingDialog';
import { asset } from '../lib/asset';

type RankState = { kind: 'idle' } | { kind: 'sending' } | { kind: 'ranked'; info: BallRank } | { kind: 'failed' } | { kind: 'offline' };

const ROUND = 30; // seconds
const ZONE = 0.22; // landing zone height (share of the jump)
const MULTS = [1, 1.5, 2, 2.5];

type Phase = 'ready' | 'playing' | 'over';

const mm = (s: number) => `00:${String(Math.ceil(s)).padStart(2, '0')}`;

/** P07 공놀이 챌린지 — tap when the pup lands in the paw circle (green zone). */
export default function BallScreen() {
  const { state, dispatch } = useGame();
  const auth = useAuth();
  const [phase, setPhase] = useState<Phase>('ready');
  const [rank, setRank] = useState<RankState>({ kind: 'idle' });
  const [showRanking, setShowRanking] = useState(false);
  const online = auth.configured && auth.status === 'signedIn';
  const [left, setLeft] = useState(ROUND);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [height, setHeight] = useState(1);
  const [shout, setShout] = useState<{ id: number; text: string; kind: string } | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [floaters, spawn] = useFloaters(800);
  const t = useRef(0);
  const lockUntil = useRef(0);
  const ended = useRef(false);

  const mult = MULTS[Math.min(combo, MULTS.length - 1)];

  useFrame((dt) => {
    t.current += dt;
    // bounce: |sin| gives a hop that lands at 0; it speeds up as time runs out
    const speed = 2.2 + (1 - left / ROUND) * 1.4;
    setHeight(Math.abs(Math.sin(t.current * speed)));
    const next = left - dt;
    if (next <= 0) {
      if (ended.current) return; // a frame can still fire before the loop stops
      ended.current = true;
      setLeft(0);
      setPhase('over');
      setNewBest(score > state.bestBall);
      dispatch({ type: 'ballResult', score });
      buzz(40);
      playSound('reward');
      if (online) {
        setRank({ kind: 'sending' });
        submitBallScore(score)
          .then((info) => setRank(info ? { kind: 'ranked', info } : { kind: 'failed' }))
          .catch(() => setRank({ kind: 'failed' }));
      } else {
        setRank({ kind: 'offline' });
      }
    } else {
      setLeft(next);
    }
  }, phase === 'playing');

  const start = () => {
    t.current = 0;
    ended.current = false;
    setScore(0);
    setCombo(0);
    setLeft(ROUND);
    setShout(null);
    setNewBest(false);
    setRank({ kind: 'idle' });
    setPhase('playing');
  };

  const tap = () => {
    if (phase !== 'playing') return start();
    const now = performance.now();
    if (now < lockUntil.current) return;
    if (height <= ZONE) {
      const pts = Math.round(120 * mult);
      setScore((s) => s + pts);
      setCombo((c) => c + 1);
      setShout({ id: now, text: '나이스 캐치!', kind: 'good' });
      spawn('82%', 96, `+${pts}`, 'text');
      buzz(20);
      playSound('catch');
    } else {
      setCombo(0);
      setShout({ id: now, text: '아쉬워요!', kind: 'miss' });
      playSound('miss');
      lockUntil.current = now + 350; // stops button mashing
    }
  };

  const best = Math.max(state.bestBall, phase === 'over' ? score : 0);

  return (
    <Screen className="ball">
      <TopBar
        style={{ gap: 8 }}
        left={
          <IconLink to={ROUTES.home} label="그만하고 홈으로">
            <PauseIcon />
          </IconLink>
        }
        right={
          <div className="timer" role="timer" aria-label={`남은 시간 ${Math.ceil(left)}초`}>
            <ClockIcon />
            <span>{mm(left)}</span>
          </div>
        }
      >
        <TitlePill icon={<BallIcon size={18} shine={false} />} fontSize={18}>
          공놀이 챌린지
        </TitlePill>
      </TopBar>

      <div className="score">
        <div className="now card stitch">
          <small>현재 점수</small>
          <b key={score} className={score ? 'bump' : undefined}>
            {fmt(score)}
          </b>
        </div>
        <div className="best">
          <small>최고 기록</small>
          <b>{fmt(best)}</b>
        </div>
        <div className="combo-box stitch-light">
          <small>콤보</small>
          <b key={mult} className="bump">
            x{mult}
          </b>
        </div>
      </div>

      <Stage grow className="ball-stage" src={asset('images/ball.png')} alt="잔디밭에서 빨간 공을 향해 점프하는 양말이와 발자국 착지 원">
          {shout ? (
            <div className={`shout pop ${shout.kind}`} key={shout.id}>
              {shout.text}
            </div>
          ) : (
            phase === 'ready' && <div className="shout hint">준비됐나요?</div>
          )}

          {phase === 'playing' && (
            <div className="ball-track" aria-hidden="true">
              <span className="zone" />
              <span className="marker" style={{ bottom: `calc(${height * 82}% + 9px)` }}>
                <PawIcon size={22} color={height <= ZONE ? '#467A2A' : '#4A2C17'} />
              </span>
            </div>
          )}

          <div className="callout">
            <ThrowUpIcon />
            {phase === 'over' ? (
              <div>
                <p className="hand" style={{ fontSize: 18, color: 'var(--ink)' }}>
                  {newBest ? '최고 기록 달성!' : '수고했어요!'} 최종 {fmt(score)}점
                </p>
                <p style={{ fontSize: 12 }} aria-live="polite">
                  {rank.kind === 'ranked'
                    ? `이번 주 ${fmt(rank.info.rank)}위 / ${fmt(rank.info.players)}명 · 주간 최고 ${fmt(rank.info.best)}점`
                    : rank.kind === 'sending'
                      ? '랭킹에 기록하는 중…'
                      : rank.kind === 'failed'
                        ? '랭킹 기록에 실패했어요 · 즐거움 +40 · 코인 +50'
                        : '로그인하면 주간 랭킹에 올라가요 · 코인 +50'}
                </p>
              </div>
            ) : (
              <div>
                <p className="hand" style={{ fontSize: 18, color: 'var(--ink)' }}>
                  공을 위로 휙! 던지고
                </p>
                <p style={{ fontSize: 12 }}>양말이가 발자국 원(초록)에 닿는 순간 탭!</p>
              </div>
            )}
            {online && phase !== 'playing' && (
              <Button size="sm" style={{ boxShadow: 'none', outline: 'none', marginLeft: 'auto' }} onClick={() => setShowRanking(true)}>
                랭킹
              </Button>
            )}
          </div>
          <Floaters items={floaters} />
        </Stage>
        {showRanking && <RankingDialog onClose={() => setShowRanking(false)} />}

      <div className="chips">
        <Chip>즐거움 +40</Chip>
        <Chip>체력 -15</Chip>
        <Chip>EXP +30~120</Chip>
      </div>

      <Button size="xl" onClick={tap}>
        <PawIcon size={30} color="#4A2C17" />
        {phase === 'playing' ? '탭! 점프 캐치' : phase === 'over' ? '다시 하기' : '탭! 시작하기'}
      </Button>
    </Screen>
  );
}
