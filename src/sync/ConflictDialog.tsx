import { useEffect, useRef } from 'react';
import { TODOS } from '../data/mock';
import { fmt, type GameState } from '../game/state';
import type { Conflict } from './SyncProvider';

function Summary({ title, s, when }: { title: string; s: GameState; when: string }) {
  const done = TODOS.filter((t) => s.todos[t.id]).length;
  return (
    <div className="save-card">
      <b>{title}</b>
      <dl>
        <div>
          <dt>레벨</dt>
          <dd>Lv.{s.level}</dd>
        </div>
        <div>
          <dt>코인</dt>
          <dd>{fmt(s.coins)}</dd>
        </div>
        <div>
          <dt>하트</dt>
          <dd>{fmt(s.hearts)}</dd>
        </div>
        <div>
          <dt>오늘의 할 일</dt>
          <dd>{done} / 5</dd>
        </div>
      </dl>
      <small>{when}</small>
    </div>
  );
}

const timeText = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })} 저장`;
};

/** Asks which progress to keep when this device and the cloud disagree. Not dismissable: one must be chosen. */
export function ConflictDialog({ conflict, device, onChoose }: { conflict: Conflict; device: GameState; onChoose: (c: 'device' | 'cloud') => void }) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), []);

  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="conflict-title" aria-describedby="conflict-desc">
        <h2 id="conflict-title">어느 진행을 이어갈까요?</h2>
        <p id="conflict-desc">
          {conflict.reason === 'device'
            ? '이 기기에서 플레이한 진행과 계정에 저장된 진행이 달라요.'
            : '다른 기기에서 저장한 진행과 이 기기의 진행이 달라요.'}{' '}
          고르지 않은 쪽은 사라져요.
        </p>
        <div className="save-cards">
          <Summary title="이 기기" s={device} when="지금 플레이 중" />
          <Summary title="계정(클라우드)" s={conflict.cloudState} when={timeText(conflict.cloud.updatedAt)} />
        </div>
        <div className="dialog-actions">
          <button ref={first} type="button" className="btn btn-paper btn-lg" onClick={() => onChoose('device')}>
            이 기기 진행
          </button>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => onChoose('cloud')}>
            계정 진행
          </button>
        </div>
      </div>
    </div>
  );
}
