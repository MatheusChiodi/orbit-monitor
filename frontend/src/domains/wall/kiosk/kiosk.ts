import { useCallback, useEffect, useRef, useState } from 'react';

/** FE-45: the cursor hides after it stays still this long. */
export const CURSOR_IDLE_MS = 3000;
const HIDDEN_CLASS = 'kiosk-cursor-hidden';

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

interface WakeLockLike {
  request: (type: 'screen') => Promise<WakeLockSentinelLike>;
}

function wakeLockApi(): WakeLockLike | null {
  const api = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock;
  return api && typeof api.request === 'function' ? api : null;
}

export interface Kiosk {
  active: boolean;
  /** Whether a Screen Wake Lock is held (false on TVs without the API). */
  wakeLock: boolean;
  enter: () => Promise<void>;
  exit: () => Promise<void>;
}

/** Kiosk mode for the TV: fullscreen, Screen Wake Lock (re-acquired on visibility) and a hidden idle cursor. */
export function useKiosk(): Kiosk {
  const [active, setActive] = useState(false);
  const [wakeLock, setWakeLock] = useState(false);
  const sentinel = useRef<WakeLockSentinelLike | null>(null);

  const acquire = useCallback(async () => {
    const api = wakeLockApi();
    if (!api) {
      setWakeLock(false);
      return;
    }
    try {
      sentinel.current = await api.request('screen');
      setWakeLock(true);
    } catch {
      setWakeLock(false);
    }
  }, []);

  const enter = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      // fullscreen can be refused without a user gesture; kiosk still keeps the screen awake
    }
    await acquire();
    setActive(true);
  }, [acquire]);

  const exit = useCallback(async () => {
    await sentinel.current?.release();
    sentinel.current = null;
    setWakeLock(false);
    setActive(false);
    document.documentElement.classList.remove(HIDDEN_CLASS);
  }, []);

  useEffect(() => {
    if (!active) return;
    const hide = () => document.documentElement.classList.add(HIDDEN_CLASS);
    let timer = setTimeout(hide, CURSOR_IDLE_MS);
    const onMove = () => {
      document.documentElement.classList.remove(HIDDEN_CLASS);
      clearTimeout(timer);
      timer = setTimeout(hide, CURSOR_IDLE_MS);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('mousemove', onMove);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('mousemove', onMove);
    };
  }, [active, acquire]);

  return { active, wakeLock, enter, exit };
}
