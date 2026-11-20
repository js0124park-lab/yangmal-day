import { useEffect, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconLink, Screen } from '../components/ui';
import { useToast } from '../components/Toast';
import { CheckIcon, CloseIcon, GiftIcon, PawIcon } from '../components/icons';
import { BONUS, TODOS } from '../data/mock';
import { buzz } from '../game/hooks';
import { useGame } from '../game/state';
import { ROUTES } from '../routes';

/** P04 오늘의 할 일 — bottom sheet over the room. Tap the backdrop or press Esc to close. */
export default function TodoScreen() {
  const { state, dispatch } = useGame();
  const toast = useToast();
  const navigate = useNavigate();
  const done = TODOS.filter((t) => state.todos[t.id]).length;
  const ready = done === 5 && !state.bonusClaimed;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(ROUTES.home);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const claim = () => {
    dispatch({ type: 'claimBonus' });
    buzz(30);
    toast(`보너스 상자! 코인 +${BONUS.coins} · 하트 +${BONUS.hearts} · EXP +${BONUS.exp}`);
  };

  return (
    <Screen className="todo">
      <div className="backdrop" aria-hidden="true" onClick={() => navigate(ROUTES.home)}>
        <img src="/images/room.png" alt="" />
      </div>

      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="todo-title">
        <div className="grip" />

        <div className="sheet-head">
          <div className="label">
            <PawIcon />
            <h2 id="todo-title">오늘의 할 일</h2>
          </div>
          <IconLink to={ROUTES.home} label="닫기">
            <CloseIcon />
          </IconLink>
        </div>

        <div className="sheet-sub">
          <b>{done} / 5 완료</b>
          <span>새벽 5시에 새 할 일이 생겨요</span>
        </div>

        <div className="notes">
          {TODOS.map((t) => {
            const isDone = state.todos[t.id];
            return (
              <div key={t.id} className={isDone ? 'note is-done' : 'note'} style={{ '--bg': t.color, '--rot': t.rotate } as CSSProperties}>
                <div className="top">
                  <span className="name">{t.name}</span>
                  <button
                    className="check"
                    type="button"
                    aria-pressed={isDone}
                    aria-label={`${t.name} 완료`}
                    onClick={() => {
                      dispatch({ type: 'toggleTodo', id: t.id });
                      buzz();
                    }}
                  >
                    <CheckIcon />
                  </button>
                </div>
                <span className="reward">{t.reward}</span>
                <div className="foot">
                  <Link className="go" to={t.to}>
                    바로가기
                  </Link>
                  <span className="done-stamp">완료!</span>
                </div>
                {t.curl && (
                  <svg className="curl" width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
                    <path d="M26 0L0 26H26z" fill="#FFF7EC" />
                    <path d="M26 0C20 12 12 20 0 26C10 16 16 8 26 0z" fill="rgba(74,44,23,0.14)" />
                  </svg>
                )}
              </div>
            );
          })}

          <div className={ready ? 'note bonus ready' : 'note bonus'}>
            <div className="top">
              <GiftIcon size={28} color="#FFFDF8" ribbon="#B8423D" strokeWidth={1.8} />
              <span className="name">보너스 상자</span>
            </div>
            <span className="reward">
              5개 모두 하면 코인 {BONUS.coins} · 하트 {BONUS.hearts} · EXP {BONUS.exp}
            </span>
            <button type="button" disabled={!ready} onClick={claim}>
              {state.bonusClaimed ? '받았어요!' : `받기 ${done}/5`}
            </button>
          </div>
        </div>
      </section>
    </Screen>
  );
}
