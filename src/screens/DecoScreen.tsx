import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Bubble, Button, IconLink, Screen, TitlePill, TopBar } from '../components/ui';
import { useToast } from '../components/Toast';
import { BackIcon, CheckIcon, CoinDotIcon, HeartIcon, HouseIcon, RotateIcon, StoreBoxIcon } from '../components/icons';
import { DECO_CATEGORIES, DECO_SPACES, FURNITURE, POSES, type DecoCategory, type FurnitureDef, type FurnitureKind, type PoseId } from '../data/mock';
import { buzz } from '../game/hooks';
import { playSound } from '../game/sound';
import { fmt, useGame } from '../game/state';
import { ROUTES } from '../routes';

const FURNITURE_ART: Record<FurnitureKind, ReactNode> = {
  cushion: (
    <>
      <ellipse cx="28" cy="30" rx="25" ry="11" fill="#F6B5C3" stroke="#4A2C17" strokeWidth="2" />
      <ellipse cx="28" cy="25" rx="17" ry="7" fill="#FFF7EC" stroke="#4A2C17" strokeWidth="2" />
      <circle cx="28" cy="35" r="3" fill="#E89B3C" />
    </>
  ),
  cabinet: (
    <>
      <rect x="10" y="6" width="36" height="32" rx="3" fill="#D9A066" stroke="#4A2C17" strokeWidth="2" />
      <path d="M10 22h36" stroke="#4A2C17" strokeWidth="2" />
      <circle cx="28" cy="15" r="2" fill="#4A2C17" />
      <circle cx="28" cy="30" r="2" fill="#4A2C17" />
      <path d="M13 38v4M43 38v4" stroke="#4A2C17" strokeWidth="2" />
    </>
  ),
  plant: (
    <>
      <path d="M28 24c-2-8-10-12-14-10 2 6 8 10 14 10zM28 24c2-10 10-16 16-14-2 8-10 14-16 14zM28 24c0-8 0-14 0-20" fill="#9BC86A" stroke="#4A2C17" strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 26h20l-3 16H21z" fill="#E89B3C" stroke="#4A2C17" strokeWidth="2" strokeLinejoin="round" />
    </>
  ),
  lamp: (
    <>
      <path d="M18 18l6-14h8l6 14z" fill="#FFF2C9" stroke="#4A2C17" strokeWidth="2" strokeLinejoin="round" />
      <path d="M28 18v20M20 40h16" stroke="#4A2C17" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  window: (
    <>
      <rect x="8" y="6" width="40" height="30" rx="4" fill="#A9D8F0" stroke="#4A2C17" strokeWidth="2" />
      <path d="M28 6v30M8 21h40" stroke="#4A2C17" strokeWidth="2" />
    </>
  ),
  crown: (
    <>
      <rect x="18" y="18" width="20" height="18" rx="3" fill="#D9BFA0" stroke="#6B4226" strokeWidth="2" />
      <path d="M22 18v-5a6 6 0 0 1 12 0v5" fill="none" stroke="#6B4226" strokeWidth="2.4" />
    </>
  ),
};

type ItemStatus = 'placed' | 'owned' | 'shop' | 'locked';

/** Arrow-key roving focus for a row of tabs/radios. */
function useRoving(count: number, onMove: (i: number) => void) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + count) % count;
    onMove(n);
    refs.current[n]?.focus();
  };
  const setRef = (i: number) => (el: HTMLButtonElement | null) => {
    refs.current[i] = el;
  };
  return { onKeyDown, setRef };
}

/** P13 집 꾸미기 */
export default function DecoScreen() {
  const { state, dispatch, reward } = useGame();
  const toast = useToast();
  const [space, setSpace] = useState(0);
  const [category, setCategory] = useState<DecoCategory>('all');
  const { deco } = state;
  const pose = POSES.find((p) => p.id === deco.pose) ?? POSES[0];

  const comfort = 48 + deco.owned.length * 6 + (deco.placed ? 12 : 0);
  const nap = Math.round(comfort * 0.3);

  const statusOf = (f: FurnitureDef): ItemStatus => {
    if (deco.placed === f.kind) return 'placed';
    if (deco.owned.includes(f.kind)) return 'owned';
    if (f.unlockLevel && state.level < f.unlockLevel) return 'locked';
    return f.price ? 'shop' : 'owned';
  };

  const items = FURNITURE.filter((f) => category === 'all' || f.category === category);

  const setPose = (id: PoseId) => dispatch({ type: 'pose', pose: id });

  const tapItem = (f: FurnitureDef) => {
    const st = statusOf(f);
    buzz();
    if (st === 'locked') return toast(`${f.name}은(는) Lv.${f.unlockLevel}에 열려요`);
    if (st === 'placed') return toast('이미 배치 중이에요. 위의 버튼으로 회전하거나 보관할 수 있어요');
    if (st === 'shop' && f.price && f.currency) {
      const wallet = f.currency === 'coin' ? state.coins : state.hearts;
      if (wallet < f.price) return toast(f.currency === 'coin' ? '코인이 부족해요' : '하트가 부족해요');
      dispatch({ type: 'buy', kind: f.kind, price: f.price, currency: f.currency });
      playSound('coin');
      toast(`${f.name}을(를) 샀어요! 바로 배치해 볼게요`);
    }
    dispatch({ type: 'place', kind: f.kind });
    setPose('run');
  };

  const confirm = () => {
    if (!deco.placed) return toast('먼저 가구를 골라 주세요');
    const first = !state.todos.deco;
    reward(first ? { coins: 30, exp: 50, stats: { joy: 5 }, todo: 'deco' } : { stats: { joy: 2 } });
    setPose('wink');
    buzz(25);
    playSound('reward');
    toast(first ? '배치 완료! 코인 +30 · EXP +50' : '배치 완료!');
  };

  const spaceKeys = useRoving(DECO_SPACES.length, setSpace);
  const catKeys = useRoving(DECO_CATEGORIES.length, (i) => setCategory(DECO_CATEGORIES[i].id));
  const poseKeys = useRoving(POSES.length, (i) => setPose(POSES[i].id));

  return (
    <Screen className="deco">
      <TopBar
        left={
          <IconLink to={ROUTES.home} label="홈으로 돌아가기">
            <BackIcon />
          </IconLink>
        }
        right={
          <Button className="save-btn" onClick={() => toast('저장했어요!')}>
            저장
          </Button>
        }
      >
        <TitlePill icon={<HouseIcon />}>집 꾸미기</TitlePill>
      </TopBar>

      <div className="deco-bar">
        <div className="spaces" role="tablist" aria-label="공간">
          {DECO_SPACES.map((s, i) => (
            <button
              key={s}
              ref={spaceKeys.setRef(i)}
              role="tab"
              type="button"
              aria-selected={i === space}
              tabIndex={i === space ? 0 : -1}
              onClick={() => {
                setSpace(i);
                if (i > 0) toast(`${s} 꾸미기는 준비 중이에요`);
              }}
              onKeyDown={(e) => spaceKeys.onKeyDown(e, i)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="comfort panel stitch">
          편안함{' '}
          <b key={comfort} className="bump">
            {comfort}
          </b>
          <span>낮잠 +{nap}%</span>
        </div>
      </div>

      <div className="stage deco-stage">
        <img className="cover" src="/images/deco-room.png" alt="창가에 분홍 쿠션 소파와 발바닥 러그가 놓인 밝은 방" />
        {deco.placed && (
          <>
            <div className={deco.flipped ? 'select flipped' : 'select'} key={deco.placed}>
              {/* pop animates the wrapper so it never fights the flip transform on the svg */}
              <span className="pop" style={{ display: 'flex' }}>
                <svg width="112" height="88" viewBox="0 0 56 44" aria-hidden="true">
                  {FURNITURE_ART[deco.placed]}
                </svg>
              </span>
            </div>
            <div className="tools">
              <button type="button" aria-label="회전" onClick={() => dispatch({ type: 'flip' })}>
                <RotateIcon />
              </button>
              <button
                type="button"
                aria-label="보관함에 넣기"
                onClick={() => {
                  dispatch({ type: 'place', kind: null });
                  setPose('sit');
                  toast('보관함에 넣었어요');
                }}
              >
                <StoreBoxIcon />
              </button>
              <button className="ok" type="button" aria-label="배치 확정" onClick={confirm}>
                <CheckIcon size={18} color="#4A2C17" strokeWidth={3} />
              </button>
            </div>
          </>
        )}
        <img className="pose" src={pose.src} alt={pose.alt} style={{ right: pose.right, bottom: pose.bottom, width: pose.width }} />
        <Bubble key={pose.id} className="say">
          {pose.say}
        </Bubble>
      </div>

      <div className="reactions">
        <span>양말이 반응</span>
        <div className="opts" role="radiogroup" aria-label="양말이 반응 미리보기">
          {POSES.map((p, i) => (
            <button
              key={p.id}
              ref={poseKeys.setRef(i)}
              role="radio"
              type="button"
              aria-checked={p.id === pose.id}
              tabIndex={p.id === pose.id ? 0 : -1}
              onClick={() => setPose(p.id)}
              onKeyDown={(e) => poseKeys.onKeyDown(e, i)}
            >
              <img src={p.src} alt="" />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cats" role="tablist" aria-label="가구 종류">
        {DECO_CATEGORIES.map((c, i) => (
          <button
            key={c.id}
            ref={catKeys.setRef(i)}
            role="tab"
            type="button"
            aria-selected={c.id === category}
            tabIndex={c.id === category ? 0 : -1}
            onClick={() => setCategory(c.id)}
            onKeyDown={(e) => catKeys.onKeyDown(e, i)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="items">
        {items.length === 0 && <p style={{ gridColumn: '1 / -1', fontSize: 13, textAlign: 'center' }}>이 종류의 가구가 아직 없어요</p>}
        {items.map((f) => {
          const st = statusOf(f);
          const afford = f.currency === 'heart' ? state.hearts >= (f.price ?? 0) : state.coins >= (f.price ?? 0);
          return (
            <button
              key={f.kind}
              type="button"
              className={st === 'placed' ? 'item placed' : st === 'locked' ? 'item locked' : 'item'}
              onClick={() => tapItem(f)}
              aria-label={
                st === 'shop'
                  ? `${f.name}, ${f.currency === 'coin' ? '코인' : '하트'} ${fmt(f.price ?? 0)}에 사기`
                  : st === 'locked'
                    ? `${f.name}, Lv.${f.unlockLevel}에 열려요`
                    : `${f.name}, ${st === 'placed' ? '배치 중' : '보유, 눌러서 배치'}`
              }
            >
              <svg width="56" height="44" viewBox="0 0 56 44" aria-hidden="true">
                {FURNITURE_ART[f.kind]}
              </svg>
              <b>{f.name}</b>
              {st === 'placed' && <small>배치 중</small>}
              {st === 'owned' && <small>보유</small>}
              {st === 'locked' && <small>Lv.{f.unlockLevel}에 열려요</small>}
              {st === 'shop' && (
                <span className={afford ? 'price' : 'price cant'}>
                  {f.currency === 'coin' ? <CoinDotIcon /> : <HeartIcon size={12} strokeWidth={2.5} />}
                  {fmt(f.price ?? 0)}
                </span>
              )}
              {(st === 'placed' || st === 'owned') && (
                <span className="owned" aria-hidden="true">
                  <CheckIcon size={12} color="#4A2C17" strokeWidth={4} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Screen>
  );
}
