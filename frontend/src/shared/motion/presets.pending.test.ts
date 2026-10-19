import { describe, expect, it } from 'vitest';
import { MOTION_KINDS, motionPreset, staggerDelay, statusTransition, valueFlashTransition } from './presets';
import { ANIMATION_LEVELS } from './animationLevel';

const MAX_PX = 8;

function translateOf(target: unknown): number {
  if (!target || typeof target !== 'object') return 0;
  const t = target as { y?: number; x?: number };
  return Math.max(Math.abs(t.y ?? 0), Math.abs(t.x ?? 0));
}

describe('FE-51 motion presets by animation level', () => {
  it('covers every documented moment', () => {
    expect(MOTION_KINDS).toEqual(
      expect.arrayContaining(['enter', 'exit', 'listItem', 'hero', 'status', 'reorder', 'expand', 'dialog', 'toast', 'hover', 'press', 'drag']),
    );
  });

  it('off: no initial state, zero duration, nothing moves', () => {
    for (const kind of MOTION_KINDS) {
      const preset = motionPreset('off', kind);
      expect(preset.initial).toBe(false);
      expect(preset.transition).toEqual({ duration: 0 });
      expect(translateOf(preset.exit)).toBe(0);
    }
  });

  it('minimal: opacity and color only (no translate, no scale)', () => {
    for (const kind of MOTION_KINDS) {
      const { initial, animate, exit } = motionPreset('minimal', kind);
      for (const target of [initial, animate, exit]) {
        if (target && typeof target === 'object') {
          expect(target).not.toHaveProperty('y');
          expect(target).not.toHaveProperty('x');
          expect(target).not.toHaveProperty('scale');
        }
      }
    }
  });

  it('standard enter: opacity 0 → 1, y 4–8 px → 0, scale .98 → 1, ease.out, 280 ms', () => {
    const preset = motionPreset('standard', 'enter');
    expect(preset.initial).toEqual({ opacity: 0, y: 6, scale: 0.98 });
    expect(preset.animate).toEqual({ opacity: 1, y: 0, scale: 1 });
    expect(preset.transition).toEqual({ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] });
  });

  it('standard exit: opacity → 0, scale → .98, ease.in, ~70% of enter', () => {
    const preset = motionPreset('standard', 'exit');
    expect(preset.exit).toEqual({ opacity: 0, scale: 0.98, transition: { duration: 0.196, ease: [0.4, 0, 1, 1] } });
  });

  it('the hero swap keeps 350 ms', () => {
    expect(motionPreset('standard', 'hero').transition).toMatchObject({ duration: 0.35 });
  });

  it('expressive is 1.25× slower and never moves more than 8 px', () => {
    expect(motionPreset('expressive', 'enter').transition).toMatchObject({ duration: 0.35 });
    for (const level of ANIMATION_LEVELS) {
      for (const kind of MOTION_KINDS) {
        const p = motionPreset(level, kind);
        expect(translateOf(p.initial)).toBeLessThanOrEqual(MAX_PX);
        expect(translateOf(p.exit)).toBeLessThanOrEqual(MAX_PX);
        expect(p.transition).not.toHaveProperty('type', 'spring');
      }
    }
  });

  it('reorder uses ease.inOut layout transitions', () => {
    expect(motionPreset('standard', 'reorder').transition).toEqual({ duration: 0.4, ease: [0.4, 0, 0.2, 1] });
  });

  it('press scales to .98 and drag lifts to 1.02 (not in minimal)', () => {
    expect(motionPreset('standard', 'press').animate).toEqual({ scale: 0.98 });
    expect(motionPreset('standard', 'drag').animate).toEqual({ scale: 1.02 });
    expect(motionPreset('minimal', 'drag').animate).toEqual({});
  });
});

describe('FE-51 stagger', () => {
  it('30 ms per item in standard, 45 ms in expressive', () => {
    expect(staggerDelay('standard', 2, 5)).toBeCloseTo(0.06);
    expect(staggerDelay('expressive', 2, 5)).toBeCloseTo(0.09);
  });
  it('no stagger above 8 items, nor in minimal/off', () => {
    expect(staggerDelay('standard', 2, 9)).toBe(0);
    expect(staggerDelay('minimal', 2, 5)).toBe(0);
    expect(staggerDelay('off', 2, 5)).toBe(0);
  });
});

describe('FE-51 status and value transitions', () => {
  it('status colors cross-fade in 400 ms (instant when off)', () => {
    expect(statusTransition('standard')).toEqual({ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] });
    expect(statusTransition('expressive')).toMatchObject({ duration: 0.5 });
    expect(statusTransition('off')).toEqual({ duration: 0 });
  });

  it('value flash is 600 ms, also in minimal (color only), never in off', () => {
    expect(valueFlashTransition('standard')).toEqual({ duration: 0.6 });
    expect(valueFlashTransition('minimal')).toEqual({ duration: 0.6 });
    expect(valueFlashTransition('off')).toBeNull();
  });
});
