import { useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSync, type SyncPhase } from '../sync/SyncProvider';
import { Bubble, Meter, Screen, StatRow } from '../components/ui';
import { Floaters } from '../components/Floaters';
import { useToast } from '../components/Toast';
import {
  BallIcon,
  BowlIcon,
  ClipboardIcon,
  CoinIcon,
  DropIcon,
  GiftIcon,
  HeartIcon,
  HouseIcon,
  MailIcon,
  MissionIcon,
  PawIcon,
  SteamBowlIcon,
} from '../components/icons';
import { TODOS } from '../data/mock';
import { buzz, useFloaters } from '../game/hooks';
import { expToNext, fmt, growthStage, moodLine, useGame } from '../game/state';
import { ROUTES } from '../routes';

const PET_LINES = ['좋아요 멍!', '더 쓰다듬어 줘요!', '꼬리 살랑살랑~'];

const SYNC_DOT: Record<SyncPhase, string> = { off: 'off', syncing: 'busy', pending: 'busy', saved: 'ok', offline: 'bad', conflict: 'bad' };
const SYNC_LABEL: Record<SyncPhase, string> = {
  off: '이 기기에 저장',
  syncing: '저장 중',
  pending: '저장 대기',
  saved: '클라우드 저장됨',
  offline: '오프라인',
  conflict: '저장 확인 필요',
};

const STAT_ROWS = [
  { key: 'fullness', label: '포만감', color: 'var(--red-dark)' },
  { key: 'joy', label: '즐거움', color: 'var(--pink)' },
  { key: 'clean', label: '청결도', color: 'var(--sky)' },
  { key: 'stamina', label: '체력', color: 'var(--green)' },
] as const;

/** P03 홈 */
export default function HomeScreen() {
  const { state, dispatch } = useGame();
  const sync = useSync();
  const navigate = useNavigate();
  const toast = useToast();
  const [floaters, spawn] = useFloaters();
  const [pets, setPets] = useState(0);
  const [wiggle, setWiggle] = useState(0);

  const done = TODOS.filter((t) => state.todos[t.id]).length;
  const next = TODOS.find((t) => !state.todos[t.id]);
  const stage = growthStage(state.level);
  const need = expToNext(state.level);
  const say = pets > 0 ? PET_LINES[(pets - 1) % PET_LINES.length] : moodLine(state.stats);

  const pet = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    // keyboard activation has no pointer position: use the centre
    const x = e.clientX ? e.clientX - r.left : r.width / 2;
    const y = e.clientY ? e.clientY - r.top : r.height / 2;
    spawn(x, y, '', 'heart');
    dispatch({ type: 'pet' });
    setPets((n) => n + 1);
    setWiggle((n) => n + 1);
    buzz();
  };

  const soon = (what: string) => () => toast(`${what}은(는) 준비 중이에요`);

  return (
    <Screen className="home">
      {/* 상단 상태 바 */}
      <div className="status">
        <button type="button" className="profile card stitch" aria-label={`프로필, 설정 열기 (${SYNC_LABEL[sync.phase]})`} onClick={() => navigate(ROUTES.settings)}>
          <span className="avatar">
            <img src="/images/room.png" alt="" />
            <i className={`sync-dot ${SYNC_DOT[sync.phase]}`} aria-hidden="true" />
          </span>
          <div style={{ textAlign: 'left' }}>
            <div className="name">Lv.{state.level} 양말이</div>
            <div className="love">
              <HeartIcon size={12} />
              <Meter value={state.affection} label="친밀도" color="var(--pink)" />
              <span>{state.affection}%</span>
            </div>
          </div>
        </button>
        <div className="wallet">
          <div className="currency stitch">
            <CoinIcon />
            <span key={state.coins} className="bump">{fmt(state.coins)}</span>
            <button type="button" aria-label="코인 충전" onClick={soon('상점')}>+</button>
          </div>
          <div className="currency stitch">
            <HeartIcon />
            <span key={state.hearts} className="bump">{fmt(state.hearts)}</span>
            <button type="button" aria-label="하트 충전" onClick={soon('상점')}>+</button>
          </div>
        </div>
      </div>

      {/* 오늘의 할 일 메모지 */}
      <Link className="todo-memo card stitch" to={ROUTES.todo}>
        <span className="ico">
          <ClipboardIcon />
        </span>
        <span className="body">
          <span className="head">
            <b>오늘의 할 일</b>
            <span>{done} / 5</span>
          </span>
          <span className="segs">
            {TODOS.map((t, i) => (
              <i key={t.id} className={i < done ? 'on' : undefined} />
            ))}
          </span>
          <small>
            {next
              ? `다음 할 일: ${next.name} · 보너스 상자까지 ${5 - done}개`
              : state.bonusClaimed
                ? '오늘 할 일 끝! 내일 또 만나요'
                : '오늘 할 일 끝! 보너스 상자를 받아 가세요'}
          </small>
        </span>
      </Link>

      {/* 양말이 방 + 퀵메뉴 */}
      <div className="stage room">
        {/* re-keying only the photo replays the wiggle without remounting the floaters */}
        <img key={wiggle} className={wiggle ? 'cover wiggle' : 'cover'} src="/images/room.png" alt="거실 러그 위에서 웃고 있는 양말이" />
        <button type="button" className="pet-area" aria-label="양말이 쓰다듬기" onClick={pet} />
        <Bubble className="say" key={say}>
          {pets === 0 && state.stats.fullness < 30 ? <SteamBowlIcon /> : <HeartIcon size={20} color="#F6B5C3" />}
          {say}
        </Bubble>
        <div className="quick">
          <button type="button" onClick={soon('미션')}>
            <MissionIcon />
            미션
          </button>
          <button
            type="button"
            aria-label={state.mailRead ? '우편함' : '우편함, 새 우편 2개'}
            onClick={() => {
              if (state.mailRead) return toast('새 우편이 없어요');
              dispatch({ type: 'readMail' });
              toast('출석 선물 도착! 코인 +100');
            }}
          >
            <MailIcon />
            우편함
            {!state.mailRead && (
              <span className="badge" aria-hidden="true">
                2
              </span>
            )}
          </button>
          <button type="button" onClick={soon('이벤트')}>
            <GiftIcon />
            이벤트
          </button>
        </div>
        <div className="hint">터치해서 쓰다듬어 주세요</div>
        <Floaters items={floaters} />
      </div>

      {/* 스탯 게이지 */}
      <div className="stats panel stitch">
        {STAT_ROWS.map((s) => {
          const v = Math.round(state.stats[s.key]);
          return <StatRow key={s.key} label={s.label} value={v} color={s.color} numColor={v < 30 ? 'var(--red-dark)' : undefined} />;
        })}
      </div>

      {/* 성장 게이지 */}
      <div className="growth">
        <img src="/images/avatar-6m.png" alt={`${stage.age} ${stage.name}`} />
        <div className="body">
          <div className="head">
            <b>
              Lv.{state.level} {stage.name}
            </b>
            <span>
              EXP {fmt(state.exp)} / {fmt(need)}
            </span>
          </div>
          <Meter value={Math.round((state.exp / need) * 100)} label="다음 레벨까지 경험치" valueText={`${fmt(state.exp)} / ${fmt(need)}`} />
        </div>
      </div>

      {/* 하단 메뉴 */}
      <nav className="dock" aria-label="주요 메뉴">
        <Link to={ROUTES.kitchen}>
          <span className={state.stats.fullness < 30 ? 'tile hot' : 'tile'}>
            <BowlIcon />
          </span>
          식사
        </Link>
        <Link to={ROUTES.ball}>
          <span className={state.stats.joy < 30 ? 'tile hot' : 'tile'}>
            <BallIcon />
          </span>
          놀이
        </Link>
        <Link to={ROUTES.walk}>
          <span className="tile">
            <PawIcon size={30} color="#6B4226" />
          </span>
          산책
        </Link>
        <Link to={ROUTES.care}>
          <span className={state.stats.clean < 30 ? 'tile hot' : 'tile'}>
            <DropIcon size={30} shine />
          </span>
          케어
        </Link>
        <Link to={ROUTES.deco}>
          <span className="tile">
            <HouseIcon size={30} door />
          </span>
          꾸미기
        </Link>
      </nav>
    </Screen>
  );
}
