import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Screen, Stage, StatRow, TitlePill, TopBar } from '../components/ui';
import { useToast } from '../components/Toast';
import { HouseIcon, PawIcon, PinIcon } from '../components/icons';
import { TREATS } from '../data/mock';
import { buzz, useFrame } from '../game/hooks';
import { useGame } from '../game/state';
import { ROUTES } from '../routes';

type Dir = 'up' | 'down' | 'left' | 'right';

const DIRS: Array<{ dir: Dir; label: string; w: number; h: number; box: string; d: string; v: [number, number] }> = [
  { dir: 'up', label: '위로', w: 20, h: 15, box: '0 0 22 16', d: 'M11 2L20 13H2z', v: [0, -1] },
  { dir: 'down', label: '아래로', w: 20, h: 15, box: '0 0 22 16', d: 'M11 14L20 3H2z', v: [0, 1] },
  { dir: 'left', label: '왼쪽으로', w: 15, h: 20, box: '0 0 16 22', d: 'M2 11L13 2V20z', v: [-1, 0] },
  { dir: 'right', label: '오른쪽으로', w: 15, h: 20, box: '0 0 16 22', d: 'M14 11L3 2V20z', v: [1, 0] },
];
const KEY_DIR: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

const SPEED = 22; // map % per second
const REACH = 22; // knob travel in px
const NEAR = 9; // pick-up distance
const SMELL = 28; // hint distance
const STAMINA_PER_UNIT = 1 / 8; // 1 stamina per 8 map %

type Callout = { kind: 'idle' | 'near' | 'hint' | 'none' | 'tired'; text: string; id?: number };

function dirWord(dx: number, dy: number) {
  const v = dy < -4 ? '위' : dy > 4 ? '아래' : '';
  const h = dx < -4 ? '왼' : dx > 4 ? '오른' : '';
  if (v && h) return `${h}쪽 ${v}`;
  return h ? `${h}쪽` : v ? `${v}쪽` : '바로 근처';
}

/** P11 산책 — move with the joystick (hold, drag or arrow keys), sniff (Space) to find treats. */
export default function WalkScreen() {
  const { state, dispatch } = useGame();
  const toast = useToast();
  const [pos, setPos] = useState({ x: state.walk.x, y: state.walk.y });
  const [stamina, setStamina] = useState(state.stats.stamina);
  const [held, setHeld] = useState<Set<Dir>>(new Set());
  const [drag, setDrag] = useState<[number, number] | null>(null);
  const [callout, setCallout] = useState<Callout>({ kind: 'idle', text: '냄새 맡기를 눌러 간식을 찾아봐요!' });
  const [sniffPressed, setSniffPressed] = useState(false);
  const [joyGained, setJoyGained] = useState(0);
  const padRef = useRef<HTMLDivElement>(null);
  const travelled = useRef(0);
  const posRef = useRef(pos);
  posRef.current = pos;

  const remaining = TREATS.filter((t) => !state.walk.found.includes(t.id));

  // movement vector from held buttons/keys, or from the dragged knob
  let vx = 0;
  let vy = 0;
  if (drag) {
    [vx, vy] = drag;
  } else {
    held.forEach((d) => {
      const v = DIRS.find((x) => x.dir === d)!.v;
      vx += v[0];
      vy += v[1];
    });
    const len = Math.hypot(vx, vy);
    if (len > 1) {
      vx /= len;
      vy /= len;
    }
  }
  const moving = (vx !== 0 || vy !== 0) && stamina > 0;

  useFrame((dt) => {
    const p = posRef.current;
    const nx = Math.max(2, Math.min(98, p.x + vx * SPEED * dt));
    const ny = Math.max(4, Math.min(96, p.y + vy * SPEED * dt));
    travelled.current += Math.hypot(nx - p.x, ny - p.y);
    if (travelled.current >= 1 / STAMINA_PER_UNIT) {
      travelled.current = 0;
      setStamina((s) => Math.max(0, s - 1));
    }
    setPos({ x: nx, y: ny });
  }, moving);

  // tired: stop and say so once
  useEffect(() => {
    if (stamina <= 0) setCallout({ kind: 'tired', text: '양말이가 지쳤어요. 집에서 쉬어요' });
  }, [stamina]);

  // save position and stamina when leaving the screen
  const saved = useRef({ pos, stamina });
  saved.current = { pos, stamina };
  useEffect(
    () => () => dispatch({ type: 'walkMove', x: saved.current.pos.x, y: saved.current.pos.y, stamina: saved.current.stamina }),
    [dispatch],
  );

  const nearest = () => {
    let best: { t: (typeof TREATS)[number]; d: number } | null = null;
    for (const t of remaining) {
      const d = Math.hypot(t.x - pos.x, t.y - pos.y);
      if (!best || d < best.d) best = { t, d };
    }
    return best;
  };

  const sniff = () => {
    setSniffPressed(true);
    window.setTimeout(() => setSniffPressed(false), 160);
    buzz();
    const n = nearest();
    const id = performance.now();
    if (!n) return setCallout({ kind: 'none', text: '공원의 간식을 모두 찾았어요!', id });
    if (n.d <= NEAR) return setCallout({ kind: 'near', text: '킁킁, 간식 냄새가 나요 멍!', id });
    if (n.d <= SMELL) return setCallout({ kind: 'hint', text: `${dirWord(n.t.x - pos.x, n.t.y - pos.y)}에서 냄새가 나요!`, id });
    setCallout({ kind: 'none', text: '여긴 냄새가 안 나요...', id });
  };

  const pick = () => {
    const n = nearest();
    if (!n || n.d > NEAR) return;
    dispatch({ type: 'pickTreat', id: n.t.id });
    setJoyGained((j) => j + 6);
    buzz(30);
    toast('간식을 찾았어요! 즐거움 +6 · 코인 +10 · EXP +20');
    setCallout({ kind: 'idle', text: remaining.length === 1 ? '모든 간식을 찾았어요!' : '또 다른 냄새를 찾아볼까요?', id: performance.now() });
  };

  const sniffRef = useRef(sniff);
  sniffRef.current = sniff;

  // keyboard: arrows move while held, Space sniffs (only while this screen is open)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (KEY_DIR[e.key]) {
        e.preventDefault();
        const d = KEY_DIR[e.key];
        setHeld((h) => (h.has(d) ? h : new Set(h).add(d)));
      } else if (e.key === ' ' && tag !== 'BUTTON' && tag !== 'A' && !e.repeat) {
        e.preventDefault();
        sniffRef.current();
      }
    };
    const up = (e: KeyboardEvent) => {
      const d = KEY_DIR[e.key];
      if (!d) return;
      setHeld((h) => {
        const n = new Set(h);
        n.delete(d);
        return n;
      });
    };
    const clear = () => setHeld(new Set());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, []);

  const hold = (d: Dir, on: boolean) =>
    setHeld((h) => {
      const n = new Set(h);
      if (on) n.add(d);
      else n.delete(d);
      return n;
    });

  const dragMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = padRef.current?.getBoundingClientRect();
    if (!r) return;
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len < 6) return setDrag([0, 0]);
    const k = Math.min(1, len / REACH);
    setDrag([(dx / len) * k, (dy / len) * k]);
  };

  const knob = drag ? [drag[0] * REACH, drag[1] * REACH] : [vx * REACH, vy * REACH];
  const found = state.walk.found.length;

  return (
    <Screen className="walk">
      <TopBar
        style={{ gap: 8 }}
        left={
          <Link className="home-pill card stitch" to={ROUTES.home} style={{ boxShadow: 'none' }}>
            <HouseIcon size={20} />
            집으로
          </Link>
        }
        right={<></>}
      >
        <TitlePill icon={<PinIcon />} fontSize={18}>
          포근공원
        </TitlePill>
      </TopBar>

      <div className="walk-hud">
        <div className="panel">
          <StatRow label="체력" value={Math.round(stamina)} color="var(--green)" />
          <StatRow label="발견" value={Math.round((found / TREATS.length) * 100)} display={`${found}/${TREATS.length}`} />
        </div>
        <div className="minimap" role="img" aria-label={`미니맵, 간식 ${TREATS.length}개 중 ${found}개 발견`}>
          <svg width="92" height="62" viewBox="0 0 112 92" preserveAspectRatio="none" aria-hidden="true">
            <path d="M70 0c-8 20 10 30 42 34v-34z" fill="#A9D8F0" />
            <path d="M6 86C30 60 40 54 56 50s28-12 34-30" fill="none" stroke="#F3E2C7" strokeWidth="9" strokeLinecap="round" />
            <rect x="0" y="0" width="40" height="34" fill="#6B4226" opacity="0.18" />
            {TREATS.filter((t) => state.walk.found.includes(t.id)).map((t) => (
              <circle key={t.id} cx={t.x * 1.12} cy={t.y * 0.92} r="2.4" fill="#6B4226" opacity="0.45" />
            ))}
            <circle cx="88" cy="70" r="6" fill="#B8423D" stroke="#FFFDF8" strokeWidth="1.5" />
            <circle className="me" cx={pos.x * 1.12} cy={pos.y * 0.92} r="8" fill="#E89B3C" stroke="#4A2C17" strokeWidth="2" />
          </svg>
        </div>
      </div>

      <Stage
        grow
        className="walk-stage"
        src="/images/walk.png"
        alt="벚꽃 핀 호숫가 산책로를 걷는 양말이"
        // gentle pan around the design's framing (20% 55%); wider pans reveal art baked into the photo's right edge
        imgStyle={{ objectPosition: `${20 + (pos.x - 50) * 0.12}% ${55 + (pos.y - 54) * 0.15}%` }}
      >
        <div className="finds">
          <span>뼈다귀 x{state.walk.bones}</span>
          <span>발도장 x{state.walk.stamps}</span>
          <span>즐거움 +{18 + joyGained}</span>
        </div>
        <div className={callout.id ? 'callout sniffing' : 'callout'} key={callout.id ?? 0}>
          <span className="alert-dot" aria-hidden="true">
            !
          </span>
          <span className="hand" aria-live="polite">
            {callout.text}
          </span>
          {callout.kind === 'near' && (
            <Button size="sm" style={{ boxShadow: 'none', outline: 'none' }} onClick={pick}>
              줍기
            </Button>
          )}
        </div>
      </Stage>

      <div className="controls">
        <div className="pad" ref={padRef} role="group" aria-label="이동 조이스틱, 드래그하거나 방향을 눌러 이동">
          <svg width="143" height="143" viewBox="0 0 168 168" aria-hidden="true">
            <circle cx="84" cy="84" r="58" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" />
            <path d="M43 43L60 60M125 43L108 60M43 125L60 108M125 125L108 108" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {DIRS.map((b) => (
            <button
              key={b.dir}
              className={b.dir}
              type="button"
              aria-pressed={held.has(b.dir)}
              aria-label={b.label}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                hold(b.dir, true);
              }}
              onPointerUp={() => hold(b.dir, false)}
              onPointerCancel={() => hold(b.dir, false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  hold(b.dir, true);
                }
              }}
              onKeyUp={() => hold(b.dir, false)}
              onBlur={() => hold(b.dir, false)}
            >
              <svg width={b.w} height={b.h} viewBox={b.box} aria-hidden="true">
                <path d={b.d} />
              </svg>
            </button>
          ))}
          <div
            className={drag ? 'knob dragging' : 'knob'}
            aria-hidden="true"
            style={{ transform: `translate(${knob[0]}px, ${knob[1]}px)` }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setDrag([0, 0]);
            }}
            onPointerMove={(e) => drag && dragMove(e)}
            onPointerUp={() => setDrag(null)}
            onPointerCancel={() => setDrag(null)}
          >
            <PawIcon size={32} color="#4E9FCF" />
          </div>
        </div>
        <div className="help">
          <span>드래그 · 방향키로 이동</span>
          <span>Space · 버튼으로 냄새</span>
        </div>
        <button className={sniffPressed ? 'sniff pressed' : 'sniff'} type="button" aria-label="냄새 맡기" onClick={sniff}>
          <svg width="48" height="44" viewBox="0 0 48 44" aria-hidden="true">
            <path d="M24 41C17 36 4 28 4 16 4 8.5 9.5 3 16 3c3.6 0 6.4 1.6 8 4.2C25.6 4.6 28.4 3 32 3c6.5 0 12 5.5 12 13 0 12-13 20-20 25z" fill="#6B4226" stroke="#FFF7EC" strokeWidth="2.5" strokeLinejoin="round" />
            <ellipse cx="16.5" cy="20" rx="4.2" ry="3" fill="#4A2C17" transform="rotate(-20 16.5 20)" />
            <ellipse cx="31.5" cy="20" rx="4.2" ry="3" fill="#4A2C17" transform="rotate(20 31.5 20)" />
            <path d="M24 26v7" stroke="#4A2C17" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="14" cy="11" rx="4.5" ry="2.6" fill="#F6B5C3" opacity="0.9" transform="rotate(-25 14 11)" />
            <circle cx="34" cy="10" r="1.6" fill="#FFF7EC" opacity="0.8" />
          </svg>
          <span>냄새 맡기</span>
        </button>
      </div>
    </Screen>
  );
}
