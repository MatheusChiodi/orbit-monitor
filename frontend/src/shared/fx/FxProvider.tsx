import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createFrameMonitor } from './frameMonitor';
import { parseFxLevel, resolveFx, type FxLevel, type FxState } from './fxLevel';
import './fx.css';

export interface FxContextValue extends FxState {
  downgraded: boolean;
  /** "Try again" after an automatic downgrade. */
  restore: () => void;
}

const noop = () => {};

const FxContext = createContext<FxContextValue | null>(null);

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function readReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(readReducedMotion);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(REDUCED_MOTION);
    const onChange = () => setReduced(query.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

/** `?motion=` (TV override) wins, then the animation level set on <html data-animation> (FE-06). */
function defaultLevel(): FxLevel {
  return (
    parseFxLevel(new URLSearchParams(window.location.search).get('motion')) ??
    parseFxLevel(document.documentElement.dataset.animation) ??
    'standard'
  );
}

export interface FxProviderProps {
  /** Animation level for this surface; defaults to the URL / document level. */
  level?: FxLevel;
  /** An unacknowledged DOWN incident is on screen: background motion pauses. */
  incidentActive?: boolean;
  /** Watch frame time and downgrade to `minimal` when it stays above 20 ms for 3 s. */
  monitorFrames?: boolean;
  children: ReactNode;
}

export function FxProvider({ level, incidentActive = false, monitorFrames = true, children }: FxProviderProps) {
  const [fallbackLevel] = useState(defaultLevel);
  const requested = level ?? fallbackLevel;
  const reducedMotion = usePrefersReducedMotion();
  const [downgraded, setDowngraded] = useState(false);

  const fx = resolveFx({ level: requested, reducedMotion, incidentActive, downgraded });
  const animated = fx.orb || fx.background !== 'static';

  useEffect(() => {
    if (!monitorFrames || !animated) return;
    const monitor = createFrameMonitor({ onDowngrade: () => setDowngraded(true) });
    let frame = 0;
    const loop = (timestamp: number) => {
      monitor.sample(timestamp);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [monitorFrames, animated]);

  useEffect(() => {
    document.documentElement.dataset.fx = fx.level;
  }, [fx.level]);

  const value = useMemo<FxContextValue>(
    () => ({ ...fx, downgraded, restore: () => setDowngraded(false) }),
    // `fx` is derived from exactly these inputs.
    [requested, reducedMotion, incidentActive, downgraded],
  );

  return <FxContext.Provider value={value}>{children}</FxContext.Provider>;
}

const FALLBACK: FxContextValue = {
  ...resolveFx({ level: 'standard', reducedMotion: false, incidentActive: false, downgraded: false }),
  downgraded: false,
  restore: noop,
};

/** Effective FX settings for this surface. Without a provider: `standard`, honoring reduced motion. */
export function useFxLevel(): FxContextValue {
  const context = useContext(FxContext);
  const reducedMotion = usePrefersReducedMotion();
  if (context) return context;
  if (!reducedMotion) return FALLBACK;
  return { ...resolveFx({ level: 'standard', reducedMotion, incidentActive: false, downgraded: false }), downgraded: false, restore: noop };
}
