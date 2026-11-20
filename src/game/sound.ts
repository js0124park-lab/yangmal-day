// Small synthesized sound effects (Web Audio): no files to download, works offline.
// The on/off choice is a per-device preference (localStorage), not part of the cloud save.
import { useSyncExternalStore } from 'react';

export type SoundName = 'pet' | 'tap' | 'perfect' | 'good' | 'miss' | 'catch' | 'coin' | 'reward' | 'levelup' | 'splash';

const KEY = 'yangmal-sound';
let ctx: AudioContext | null = null;
const listeners = new Set<() => void>();

function readEnabled() {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}
let enabled = typeof window === 'undefined' ? false : readEnabled();

export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
  if (on) playSound('tap');
}

export function useSoundEnabled() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => enabled,
    () => false,
  );
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** One soft note with a quick attack and exponential release. */
function tone(a: AudioContext, freq: number, at: number, dur: number, type: OscillatorType = 'triangle', vol = 0.12, slideTo?: number) {
  const osc = a.createOscillator();
  const gain = a.createGain();
  const t = a.currentTime + at;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const N = { C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5, G6: 1568 };

export function playSound(name: SoundName) {
  if (!enabled) return;
  const a = audio();
  if (!a) return;
  try {
    switch (name) {
      case 'tap':
        tone(a, N.A5, 0, 0.07, 'sine', 0.07);
        break;
      case 'pet':
        tone(a, N.E5, 0, 0.1, 'triangle', 0.09);
        tone(a, N.A5, 0.07, 0.14, 'triangle', 0.08);
        break;
      case 'perfect':
        tone(a, N.C6, 0, 0.08);
        tone(a, N.E6, 0.06, 0.08);
        tone(a, N.G6, 0.12, 0.16);
        break;
      case 'good':
        tone(a, N.G5, 0, 0.12);
        break;
      case 'miss':
        tone(a, 220, 0, 0.18, 'sawtooth', 0.05, 140);
        break;
      case 'catch':
        tone(a, N.A5, 0, 0.12, 'triangle', 0.1, N.E6);
        break;
      case 'coin':
        tone(a, N.B5, 0, 0.07, 'square', 0.05);
        tone(a, N.E6, 0.07, 0.2, 'square', 0.05);
        break;
      case 'splash':
        tone(a, 900 + Math.random() * 400, 0, 0.09, 'sine', 0.06, 1800);
        break;
      case 'reward':
        [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(a, f, i * 0.08, 0.18, 'triangle', 0.09));
        break;
      case 'levelup':
        [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6].forEach((f, i) => tone(a, f, i * 0.09, 0.22, 'triangle', 0.09));
        tone(a, N.C6, 0.6, 0.5, 'sine', 0.06);
        break;
    }
  } catch {
    /* audio is a nicety; never break the game for it */
  }
}
