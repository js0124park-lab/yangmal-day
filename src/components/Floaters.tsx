import type { Floater } from '../game/hooks';
import { HeartIcon, SparkleIcon } from './icons';

/** Renders floating marks spawned by useFloaters(). Kinds: heart, foam, sparkle, text. Parent must be position: relative. */
export function Floaters({ items }: { items: Floater[] }) {
  return (
    <div className="floaters" aria-hidden="true">
      {items.map((f) => (
        <span key={f.id} className={`floater ${f.kind}`} style={{ left: f.x, top: f.y }}>
          {f.kind === 'heart' && <HeartIcon size={22} color="#F08A8A" strokeWidth={1.5} />}
          {f.kind === 'sparkle' && <SparkleIcon size={18} />}
          {f.kind === 'text' && f.content}
        </span>
      ))}
    </div>
  );
}
