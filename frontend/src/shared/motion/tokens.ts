/** Motion tokens (docs/03-design.md §4.1). Every component uses these; no ad-hoc durations. */
function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const nested of Object.values(value)) {
    if (nested && typeof nested === 'object' && !Object.isFrozen(nested)) deepFreeze(nested as object);
  }
  return Object.freeze(value);
}

export type CubicBezier = [number, number, number, number];

export const MOTION = deepFreeze({
  /** Seconds. */
  duration: { instant: 0.12, fast: 0.2, base: 0.28, slow: 0.4, hero: 0.35 },
  ease: {
    out: [0.2, 0.8, 0.2, 1] as CubicBezier,
    in: [0.4, 0, 1, 1] as CubicBezier,
    inOut: [0.4, 0, 0.2, 1] as CubicBezier,
  },
  /** Pixels; nothing ever moves more than `md`. */
  distance: { sm: 4, md: 8 },
  stagger: { step: 0.03, expressiveStep: 0.045, maxItems: 8 },
  flashMs: 600,
  sparklineDraw: 0.2,
  shimmerMs: 1600,
  exitRatio: 0.7,
  expressiveScale: 1.25,
});
