import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { useFxLevel } from '../FxProvider';

const OrbScene = lazy(() => import('./OrbScene').then((m) => ({ default: m.OrbScene })));

let webgl: boolean | null = null;

/** Probes WebGL once per page; jsdom and old TV browsers report false. */
export function webglAvailable(): boolean {
  if (webgl !== null) return webgl;
  webgl = false;
  if (typeof window === 'undefined' || !('WebGLRenderingContext' in window)) return webgl;
  try {
    const canvas = document.createElement('canvas');
    webgl = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    webgl = false;
  }
  return webgl;
}

/** Test hook: forget the cached probe. */
export function resetWebglProbe(): void {
  webgl = null;
}

/** A lost or refused WebGL context falls back to the 2D symbol instead of breaking the hero. */
class OrbBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export interface HeroOrbProps {
  /** The 2D symbol: shown at off/minimal, without WebGL and while the 3D chunk loads. */
  fallback: ReactNode;
  className?: string;
}

/**
 * Live 3D orb for "All systems operational" (docs/03-design.md §4.2). Decorative only: hidden from
 * assistive tech, and no value or label is ever rendered inside it.
 */
export function HeroOrb({ fallback, className = '' }: HeroOrbProps) {
  const fx = useFxLevel();
  const [ready, setReady] = useState(false);
  const enabled = fx.orb && webglAvailable();

  useEffect(() => {
    if (!enabled) return;
    const id = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(id);
  }, [enabled]);

  if (!enabled || !ready) return <>{fallback}</>;
  return (
    <span aria-hidden="true" className={`fx-orb fx-orb-enter ${className}`}>
      <OrbBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <OrbScene intensity={fx.intensity} />
        </Suspense>
      </OrbBoundary>
    </span>
  );
}
