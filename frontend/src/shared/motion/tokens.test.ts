import { describe, expect, it } from 'vitest';
import { MOTION } from './tokens';

describe('FE-51 motion tokens (docs/03-design.md §4.1)', () => {
  it('durations in seconds', () => {
    expect(MOTION.duration).toEqual({ instant: 0.12, fast: 0.2, base: 0.28, slow: 0.4, hero: 0.35 });
  });

  it('easings are cubic-bezier arrays (never springs)', () => {
    expect(MOTION.ease).toEqual({ out: [0.2, 0.8, 0.2, 1], in: [0.4, 0, 1, 1], inOut: [0.4, 0, 0.2, 1] });
  });

  it('translate never exceeds 8 px', () => {
    expect(MOTION.distance).toEqual({ sm: 4, md: 8 });
  });

  it('stagger is 30 ms for at most 8 items; expressive uses 45 ms', () => {
    expect(MOTION.stagger).toEqual({ step: 0.03, expressiveStep: 0.045, maxItems: 8 });
  });

  it('value flash lasts 600 ms, sparkline draw 200 ms, skeleton shimmer 1.6 s', () => {
    expect(MOTION.flashMs).toBe(600);
    expect(MOTION.sparklineDraw).toBe(0.2);
    expect(MOTION.shimmerMs).toBe(1600);
  });

  it('exit lasts about 70% of the enter duration', () => {
    expect(MOTION.exitRatio).toBeCloseTo(0.7);
  });

  it('expressive scales durations by 1.25', () => {
    expect(MOTION.expressiveScale).toBe(1.25);
  });

  it('is frozen so components cannot invent durations at runtime', () => {
    expect(Object.isFrozen(MOTION)).toBe(true);
    expect(Object.isFrozen(MOTION.duration)).toBe(true);
  });
});
