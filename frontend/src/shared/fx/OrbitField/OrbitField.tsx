import { useEffect, useRef } from 'react';
import { createOrbitField, drawOrbitField, parseColor, stepOrbitField, type OrbitColors } from './orbitGeometry';

export interface OrbitFieldProps {
  /** 0..1 particle density. */
  intensity: number;
  /** Incident on screen: freeze on the current frame. */
  paused: boolean;
}

/** A slow background does not need 60 fps; 30 halves the cost on TV boxes. */
const FRAME_MS = 1000 / 30;
const MAX_DPR = 1.5;

function themeColors(): OrbitColors {
  const style = getComputedStyle(document.documentElement);
  return { line: parseColor(style.getPropertyValue('--info')), accent: parseColor(style.getPropertyValue('--ok')) };
}

/** Canvas renderer for the orbit field. Loaded lazily by FxBackground, never on the critical path. */
export function OrbitField({ intensity, paused }: OrbitFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const colors = themeColors();
    let field = createOrbitField({ width: 1, height: 1, intensity });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const angles = field.particles.map((p) => p.angle);
      field = createOrbitField({ width, height, intensity });
      field.particles.forEach((p, i) => (p.angle = angles[i] ?? p.angle));
      drawOrbitField(ctx, field, colors);
    };
    resize();
    window.addEventListener('resize', resize);

    let frame = 0;
    let last: number | null = null;
    const loop = (timestamp: number) => {
      frame = requestAnimationFrame(loop);
      const delta = last === null ? FRAME_MS : timestamp - last;
      if (delta < FRAME_MS) return;
      last = timestamp;
      stepOrbitField(field, Math.min(delta, 100));
      drawOrbitField(ctx, field, colors);
    };
    if (!paused) frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [intensity, paused]);

  return <canvas ref={canvasRef} data-testid="fx-orbit-field" />;
}
