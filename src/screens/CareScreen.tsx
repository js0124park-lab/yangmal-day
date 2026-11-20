import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Bubble, IconLink, Meter, Screen, Stage, TitlePill, TopBar } from '../components/ui';
import { Floaters } from '../components/Floaters';
import { useToast } from '../components/Toast';
import { BackIcon, BathIcon, BrushIcon, CheckIcon, DropIcon, HealthIcon, NailIcon } from '../components/icons';
import { CARE_TABS, type CareId } from '../data/mock';
import { buzz, useFloaters } from '../game/hooks';
import { useGame, type Reward } from '../game/state';
import { ROUTES } from '../routes';

const TAB_ICONS: Record<CareId, ReactNode> = {
  bath: <BathIcon />,
  brush: <BrushIcon />,
  nail: <NailIcon />,
  health: <HealthIcon />,
};

const REWARDS: Partial<Record<CareId, { reward: Reward; gain: number }>> = {
  bath: { reward: { stats: { clean: 60 }, coins: 50, exp: 80, todo: 'care' }, gain: 60 },
  brush: { reward: { stats: { clean: 20 }, affection: 2, exp: 40, todo: 'care' }, gain: 20 },
  nail: { reward: { hearts: 5, exp: 30 }, gain: 0 },
};

const RUB_PER_STEP = 220; // px of rubbing per step

/** P12 케어 — rub the photo (bath, brush) or tap it (nail) to finish each care. */
export default function CareScreen() {
  const { state, dispatch } = useGame();
  const toast = useToast();
  const [tab, setTab] = useState<CareId>('bath');
  const [progress, setProgress] = useState<Record<CareId, number>>({ bath: 0, brush: 0, nail: 0, health: 0 });
  const [gain, setGain] = useState<number | null>(null);
  const [floaters, spawn] = useFloaters(1000, 18);
  const rub = useRef<{ x: number; y: number; dist: number } | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const def = CARE_TABS.find((t) => t.id === tab)!;
  const step = progress[tab];
  const isDone = state.careDone.includes(tab);

  const advance = (x: number, y: number) => {
    if (isDone || def.steps === 0) return;
    const next = Math.min(def.steps, step + 1);
    setProgress((p) => ({ ...p, [tab]: next }));
    buzz(15);
    for (let i = 0; i < 3; i++) spawn(x + (i - 1) * 16, y + i * 6, '', tab === 'bath' ? 'foam' : 'sparkle');
    if (next === def.steps) {
      const r = REWARDS[tab];
      if (r) {
        dispatch({ type: 'careDone', key: tab, reward: r.reward });
        setGain(r.gain || null);
      }
      toast(def.done);
    }
  };

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (def.input === 'tap') return advance(x, y);
    if (def.input === 'rub') {
      e.currentTarget.setPointerCapture(e.pointerId);
      rub.current = { x, y, dist: 0 };
    }
  };

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const cur = rub.current;
    if (!cur) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    cur.dist += Math.hypot(x - cur.x, y - cur.y);
    cur.x = x;
    cur.y = y;
    if (Math.random() < 0.12) spawn(x, y, '', tab === 'bath' ? 'foam' : 'sparkle');
    if (cur.dist >= RUB_PER_STEP) {
      cur.dist = 0;
      advance(x, y);
    }
  };

  // keyboard users: Enter/Space on the stage counts as one step
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      advance(r.width / 2, r.height / 2);
    }
  };

  const pick = (id: CareId) => {
    setTab(id);
    setGain(null);
    rub.current = null;
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + CARE_TABS.length) % CARE_TABS.length;
    pick(CARE_TABS[n].id);
    tabRefs.current[n]?.focus();
  };

  const stepLabel = def.steps === 0 ? def.verb : isDone ? '완료!' : `${def.verb} ${step} / ${def.steps}`;
  const guide = isDone ? def.done : def.text;

  return (
    <Screen className="care">
      <TopBar
        left={
          <IconLink to={ROUTES.home} label="홈으로 돌아가기">
            <BackIcon />
          </IconLink>
        }
      >
        <TitlePill icon={<DropIcon />}>케어</TitlePill>
      </TopBar>

      <div className="clean panel stitch">
        <DropIcon size={22} />
        <span className="label">청결도</span>
        <Meter value={state.stats.clean} color="var(--sky)" />
        <span className="num">{Math.round(state.stats.clean)}</span>
        {gain !== null && (
          <span className="gain" key={gain}>
            +{gain}
          </span>
        )}
      </div>

      <Stage grow className="care-stage" src="/images/bath.png" alt="거품 가득한 욕조에서 샤워를 받으며 눈을 감고 행복해하는 양말이">
        {def.input !== 'none' && (
          <div
            className="rub-area"
            role="button"
            tabIndex={0}
            aria-label={def.input === 'rub' ? `${def.title}: 문질러서 진행` : `${def.title}: 눌러서 진행`}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={() => (rub.current = null)}
            onPointerCancel={() => (rub.current = null)}
            onKeyDown={onKey}
          />
        )}
        <Bubble key={`${tab}-${isDone}`} className="say">
          {isDone ? '고마워요 멍!' : def.say}
        </Bubble>
        <div className="callout" id="care-panel" role="tabpanel" aria-live="polite">
          <div className="head">
            <b>{def.title}</b>
            <span>{stepLabel}</span>
          </div>
          <p>{guide}</p>
          {def.steps > 0 && !isDone && <Meter value={(step / def.steps) * 100} color="var(--orange)" style={{ flex: 'none', height: 8 }} />}
        </div>
        <Floaters items={floaters} />
      </Stage>

      <div className="care-tabs" role="tablist" aria-label="케어 종류">
        {CARE_TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            role="tab"
            type="button"
            aria-selected={t.id === tab}
            aria-controls="care-panel"
            tabIndex={t.id === tab ? 0 : -1}
            onClick={() => pick(t.id)}
            onKeyDown={(e) => onTabKey(e, i)}
          >
            <span className="disc">{TAB_ICONS[t.id]}</span>
            {t.label}
            {t.weekly && <span className="weekly">주 1회</span>}
            {state.careDone.includes(t.id) && (
              <span className="done-dot" aria-label="완료">
                <CheckIcon size={10} color="#4A2C17" strokeWidth={4} />
              </span>
            )}
          </button>
        ))}
      </div>
    </Screen>
  );
}
