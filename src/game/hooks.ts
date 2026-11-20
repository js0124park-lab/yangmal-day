import { useCallback, useEffect, useRef, useState } from 'react';

/** Calls `cb(dtSeconds, elapsedSeconds)` every animation frame while `active` is true. */
export function useFrame(cb: (dt: number, elapsed: number) => void, active: boolean) {
  const saved = useRef(cb);
  saved.current = cb;

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const start = last;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); // cap so a background tab does not jump
      last = now;
      saved.current(dt, (now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

export interface Floater {
  id: number;
  /** px number or any CSS length like '80%' */
  x: number | string;
  y: number | string;
  content: string;
  kind: string;
}

/** Short-lived floating marks (hearts, bubbles, +points). Each lives `life` ms. */
export function useFloaters(life = 900, max = 14) {
  const [items, setItems] = useState<Floater[]>([]);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const spawn = useCallback(
    (x: number | string, y: number | string, content: string, kind = 'heart') => {
      const id = ++seq.current;
      setItems((list) => [...list.slice(-(max - 1)), { id, x, y, content, kind }]);
      timers.current.push(window.setTimeout(() => setItems((list) => list.filter((f) => f.id !== id)), life));
    },
    [life, max],
  );

  return [items, spawn] as const;
}

/** Light haptic tick where supported. */
export function buzz(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
}

/** True when the user asked the OS for less motion. */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
