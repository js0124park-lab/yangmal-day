import { useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bubble, Button, Chip, IconLink, Screen, Stage, TitlePill, TopBar } from '../components/ui';
import { useToast } from '../components/Toast';
import { BackIcon, CheckIcon, KnifeIcon, PawIcon, StarIcon } from '../components/icons';
import { buzz, useFrame } from '../game/hooks';
import { playSound } from '../game/sound';
import { useGame } from '../game/state';
import { ROUTES } from '../routes';

const CUTS = 5;
const ingredients = [
  { name: '닭가슴살', qty: 2 },
  { name: '단호박', qty: 1 },
  { name: '브로콜리', qty: 1 },
];

type Judge = 'perfect' | 'good' | 'miss';

/** Bar zones in percent, matching the 30/15/14/15/26 grid. */
function judge(p: number): Judge {
  if (p >= 45 && p < 59) return 'perfect';
  if (p >= 30 && p < 74) return 'good';
  return 'miss';
}

const SHOUT: Record<Judge, string> = { perfect: 'Perfect!', good: 'Good!', miss: 'Miss...' };
const SAY: Record<Judge, string> = { perfect: '맛있겠다 멍!', good: '조금만 더 정확하게!', miss: '앗, 조심해요!' };

function starsFor(results: Judge[]) {
  const perfect = results.filter((r) => r === 'perfect').length;
  return perfect >= 4 ? 3 : perfect >= 2 ? 2 : 1;
}

/** P05 화식키친 — tap when the knife pointer is in the green zone, 5 cuts, then serve. */
export default function KitchenScreen() {
  const { reward } = useGame();
  const toast = useToast();
  const navigate = useNavigate();
  const [pos, setPos] = useState(0);
  const [results, setResults] = useState<Judge[]>([]);
  const [marks, setMarks] = useState<number[]>([]);
  const [combo, setCombo] = useState(0);
  const phase = useRef(0);
  const finished = results.length >= CUTS;
  const last = results[results.length - 1];

  // triangle wave 0→100→0; each cut speeds the knife up a little
  useFrame((dt) => {
    const speed = 0.55 + results.length * 0.08; // sweeps per second
    phase.current = (phase.current + dt * speed) % 2;
    const t = phase.current;
    setPos((t < 1 ? t : 2 - t) * 100);
  }, !finished);

  const cut = () => {
    if (finished) return;
    const j = judge(pos);
    setResults((r) => [...r, j]);
    setMarks((m) => [...m, pos]);
    setCombo((c) => (j === 'miss' ? 0 : c + 1));
    buzz(j === 'perfect' ? 25 : 10);
    playSound(j);
  };

  const serve = () => {
    const stars = starsFor(results);
    const leveled = reward({
      coins: 30 + stars * 10,
      exp: 60 + stars * 20,
      stats: { fullness: 30 + stars * 10 },
      todo: 'meal',
      track: { cooks: 1, threeStarCooks: stars === 3 ? 1 : 0 },
    });
    playSound('reward');
    toast(`잘 먹었습니다! 포만감 +${30 + stars * 10} · 코인 +${30 + stars * 10}`);
    navigate(leveled ? ROUTES.levelUp : ROUTES.home);
  };

  const stars = results.length ? starsFor(results) : 0;

  return (
    <Screen className="kitchen">
      <TopBar
        left={
          <IconLink to={ROUTES.home} label="홈으로 돌아가기">
            <BackIcon />
          </IconLink>
        }
      >
        <TitlePill icon={<PawIcon />}>양말이의 화식키친</TitlePill>
      </TopBar>

      <ol className="steps" aria-label="요리 단계">
        <li>
          <CheckIcon size={14} color="#6B4226" strokeWidth={3} />
          재료 선택
        </li>
        {finished ? (
          <>
            <li>
              <CheckIcon size={14} color="#6B4226" strokeWidth={3} />
              손질하기
            </li>
            <li aria-current="step">3 조리하기</li>
          </>
        ) : (
          <>
            <li aria-current="step">2 손질하기</li>
            <li className="todo">3 조리하기</li>
          </>
        )}
      </ol>

      <div className="recipe panel stitch">
        <div>
          <small>오늘의 레시피</small>
          <b>닭가슴살 단호박 화식</b>
        </div>
        <div className="stars" role="img" aria-label={`목표 별 3개 중 ${stars}개`}>
          {[1, 2, 3].map((n) => (
            <StarIcon key={`${n}-${n <= stars}`} color={n <= stars ? '#E89B3C' : '#F3E2C7'} />
          ))}
        </div>
      </div>

      <Stage className="kitchen-stage" src="/images/kitchen.png" alt="도마 위의 닭가슴살과 단호박, 칼로 써는 장면">
        {last ? (
          <div className={`shout pop ${last}`} key={`shout-${results.length}`}>
            {finished ? '완성!' : SHOUT[last]}
          </div>
        ) : (
          <div className="shout hint">초록 구간에서 탭!</div>
        )}
        <div className="pup">
          <img src="/images/avatar-6m.png" alt="기대하는 양말이" />
          <Bubble key={`say-${results.length}`}>{finished ? `별 ${stars}개 요리 완성!` : last ? SAY[last] : '맛있겠다 멍!'}</Bubble>
        </div>
        {combo >= 2 && (
          <div className="combo pop" key={`combo-${combo}`}>
            콤보 x{combo}
          </div>
        )}
      </Stage>

      <div className="timing">
        <div className="head">
          <b>{finished ? '손질 끝! 이제 조리할 차례예요' : '칼이 초록 구간에 오면 탭!'}</b>
          <span>
            손질 {Math.min(results.length, CUTS)} / {CUTS}
          </span>
        </div>
        <div className="bar" aria-hidden="true">
          <span style={{ background: 'var(--sand)' }} />
          <span style={{ background: 'var(--pink)' }} />
          <span style={{ background: 'var(--green)' }} />
          <span style={{ background: 'var(--pink)' }} />
          <span style={{ background: 'var(--sand)' }} />
          <span className="cut-marks">
            {marks.map((m, i) => (
              <i key={i} style={{ left: `${m}%` }} />
            ))}
          </span>
        </div>
        <div className="pointer" aria-hidden="true" style={{ '--at': `${pos}%` } as CSSProperties}>
          <svg width="18" height="12" viewBox="0 0 18 12">
            <path d="M9 0l9 12H0z" fill="#4A2C17" />
          </svg>
        </div>
      </div>

      <div className="chips">
        {ingredients.map((g) => (
          <Chip key={g.name} outline>
            {g.name} <b>x{g.qty}</b>
          </Chip>
        ))}
      </div>

      {finished ? (
        <Button size="xl" style={{ marginTop: 'auto' }} onClick={serve}>
          <PawIcon size={28} color="#4A2C17" />
          완성! 먹여 주기
        </Button>
      ) : (
        <Button size="xl" style={{ marginTop: 'auto' }} onClick={cut}>
          <KnifeIcon />
          탭! 썰기
        </Button>
      )}
    </Screen>
  );
}
