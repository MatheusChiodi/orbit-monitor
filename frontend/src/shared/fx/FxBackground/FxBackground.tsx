import { lazy, Suspense, useEffect, useState } from 'react';
import { useFxLevel } from '../FxProvider';

const OrbitField = lazy(() => import('../OrbitField/OrbitField').then((m) => ({ default: m.OrbitField })));

/** Waits for the first paint so the FX chunk never competes with the wall's first render. */
function useAfterFirstPaint(enabled: boolean): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled || ready) return;
    const id = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(id);
  }, [enabled, ready]);
  return enabled && ready;
}

/**
 * Fixed layer behind the content: a static brand gradient at every level, plus the animated orbit
 * field from `standard` up. It pauses while an unacknowledged incident is on screen.
 */
export function FxBackground() {
  const fx = useFxLevel();
  const animated = fx.background !== 'static';
  const mount = useAfterFirstPaint(animated);
  return (
    <div className="fx-backdrop" aria-hidden="true" data-paused={fx.backgroundPaused ? 'true' : undefined}>
      {mount && (
        <Suspense fallback={null}>
          <OrbitField intensity={fx.background === 'full' ? 1 : 0.6} paused={fx.backgroundPaused} />
        </Suspense>
      )}
    </div>
  );
}
