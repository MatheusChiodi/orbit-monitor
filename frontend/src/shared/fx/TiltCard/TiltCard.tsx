import { useRef, type HTMLAttributes, type PointerEvent } from 'react';
import { useFxLevel } from '../FxProvider';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const round = (value: number) => Math.round(value * 100) / 100 + 0;

/** Pointer position inside the card (0..1 on each axis) to rotation in degrees, capped at `maxDeg`. */
export function tiltAngles(point: { x: number; y: number }, maxDeg: number): { rotateX: number; rotateY: number } {
  return {
    rotateX: round((0.5 - clamp01(point.y)) * 2 * maxDeg),
    rotateY: round((clamp01(point.x) - 0.5) * 2 * maxDeg),
  };
}

export type TiltCardProps = HTMLAttributes<HTMLDivElement>;

/**
 * Glass card that tilts toward a mouse pointer (≤ 4°, docs/03-design.md §4.2), with a light sheen.
 * Console only, and never around probe values: data must stay flat.
 */
export function TiltCard({ className = '', children, onPointerMove, onPointerLeave, ...rest }: TiltCardProps) {
  const fx = useFxLevel();
  const ref = useRef<HTMLDivElement>(null);

  const move = (event: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    const el = ref.current;
    if (!el || !fx.tilt || event.pointerType !== 'mouse') return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const point = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
    const { rotateX, rotateY } = tiltAngles(point, fx.tiltMaxDeg);
    el.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    el.style.setProperty('--fx-sheen-x', `${Math.round(clamp01(point.x) * 100)}%`);
    el.style.setProperty('--fx-sheen-y', `${Math.round(clamp01(point.y) * 100)}%`);
    el.dataset.tilting = 'true';
  };

  const leave = (event: PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    const el = ref.current;
    if (!el) return;
    el.style.transform = '';
    delete el.dataset.tilting;
  };

  return (
    <div
      ref={ref}
      {...rest}
      onPointerMove={move}
      onPointerLeave={leave}
      className={`fx-glass relative rounded-[0.9rem] border border-line bg-s1 ${fx.tilt ? 'fx-tilt' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
