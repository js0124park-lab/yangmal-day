import { useEffect, useRef, useState } from 'react';
import { fetchBallRanking, type RankRow } from '../lib/cloudSave';
import { fmt } from '../game/state';

/** Weekly ball-game top 10 (nicknames only). Esc, the backdrop or 닫기 closes it. */
export function RankingDialog({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<RankRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeCb = useRef(onClose);
  closeCb.current = onClose;

  useEffect(() => {
    let alive = true;
    fetchBallRanking(10)
      .then((r) => alive && setRows(r))
      .catch(() => alive && setFailed(true));
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCb.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      alive = false;
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, []);

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog ranking" role="dialog" aria-modal="true" aria-labelledby="rank-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="rank-title">이번 주 공놀이 랭킹</h2>
        <p>매주 월요일에 새로 시작해요</p>
        {failed ? (
          <p className="form-msg error">랭킹을 불러오지 못했어요. 연결을 확인해 주세요.</p>
        ) : !rows ? (
          <p aria-live="polite">불러오는 중…</p>
        ) : rows.length === 0 ? (
          <p>아직 기록이 없어요. 첫 번째 주인공이 되어 보세요!</p>
        ) : (
          <ol className="rank-list">
            {rows.map((r, i) => (
              <li key={i} className={r.isMe ? 'me' : undefined}>
                <span className={`medal m${r.rank}`}>{r.rank}</span>
                <span className="who">
                  {r.nickname}
                  {r.isMe && <small> (나)</small>}
                </span>
                <b>{fmt(r.score)}</b>
              </li>
            ))}
          </ol>
        )}
        <button ref={closeRef} type="button" className="btn btn-primary btn-lg" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
