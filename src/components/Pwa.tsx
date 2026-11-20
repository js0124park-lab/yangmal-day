// Service worker registration (offline start + update prompt) and the "install as app" prompt.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { useToast } from './Toast';

/** Registers the service worker once. Offers a reload when a new version is ready (never reloads by itself). */
export function PwaUpdater() {
  const toast = useToast();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const update = registerSW({
      onNeedRefresh() {
        toast('새 버전이 준비됐어요', { label: '새로고침', onClick: () => void update(true) });
      },
      onOfflineReady() {
        // first install only: from now on the game opens without internet
        try {
          if (localStorage.getItem('yangmal-offline-told')) return;
          localStorage.setItem('yangmal-offline-told', '1');
        } catch {
          /* ignore */
        }
        toast('이제 인터넷 없이도 양말이를 만날 수 있어요');
      },
    });
  }, [toast]);

  return null;
}

// ---------- install prompt ----------

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // keep it for our own button instead of the browser mini-bar
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export type InstallState = 'installed' | 'available' | 'ios' | 'unsupported';

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Whether the game can be installed here, and how. */
export function useInstall() {
  const available = useSyncExternalStore(subscribe, () => deferred !== null);
  const [installed, setInstalled] = useState(() => isStandalone());

  useEffect(() => {
    const mq = window.matchMedia?.('(display-mode: standalone)');
    const on = () => setInstalled(isStandalone());
    mq?.addEventListener?.('change', on);
    return () => mq?.removeEventListener?.('change', on);
  }, []);

  const state: InstallState = installed ? 'installed' : available ? 'available' : isIos() ? 'ios' : 'unsupported';

  const install = async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    emit();
    return outcome === 'accepted';
  };

  return { state, install };
}
