import { describe, expect, it } from 'vitest';
import {
  MAX_LUMINANCE_DELTA,
  capAlpha,
  createOrbitField,
  drawOrbitField,
  parseColor,
  relativeLuminance,
  stepOrbitField,
} from './orbitGeometry';

const colors = { line: parseColor('#3b9eff'), accent: parseColor('#22c55e') };

/** Records every stroke/fill alpha the renderer uses. */
function recordingContext() {
  const alphas: { alpha: number; style: string }[] = [];
  let style = '';
  const ctx = {
    globalAlpha: 1,
    lineWidth: 1,
    set strokeStyle(value: string) {
      style = value;
    },
    set fillStyle(value: string) {
      style = value;
    },
    clearRect: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    ellipse: () => {},
    arc: () => {},
    stroke: () => alphas.push({ alpha: ctx.globalAlpha, style }),
    fill: () => alphas.push({ alpha: ctx.globalAlpha, style }),
    fillText: () => {
      throw new Error('the background never draws text');
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, alphas };
}

describe('FE-52 orbit field', () => {
  it('parses theme colors in hex and rgb()', () => {
    expect(parseColor('#3b9eff')).toEqual({ r: 59, g: 158, b: 255 });
    expect(parseColor(' rgb(34, 197, 94) ')).toEqual({ r: 34, g: 197, b: 94 });
    expect(parseColor('nonsense')).toBeNull();
  });

  it('caps alpha so a mark never changes luminance by more than 6%', () => {
    expect(MAX_LUMINANCE_DELTA).toBe(0.06);
    const white = { r: 255, g: 255, b: 255 };
    expect(capAlpha(white, 1) * relativeLuminance(white)).toBeLessThanOrEqual(0.06);
    expect(capAlpha(white, 0.01)).toBe(0.01);
  });

  it('low intensity has fewer particles than full', () => {
    const low = createOrbitField({ width: 1920, height: 1080, intensity: 0.6, seed: 1 });
    const full = createOrbitField({ width: 1920, height: 1080, intensity: 1, seed: 1 });
    expect(low.particles.length).toBeLessThan(full.particles.length);
    expect(low.orbits.length).toBeGreaterThanOrEqual(4);
  });

  it('is deterministic for a seed', () => {
    const a = createOrbitField({ width: 800, height: 600, intensity: 1, seed: 7 });
    const b = createOrbitField({ width: 800, height: 600, intensity: 1, seed: 7 });
    expect(a).toEqual(b);
  });

  it('step moves particles slowly along their orbits', () => {
    const field = createOrbitField({ width: 800, height: 600, intensity: 1, seed: 3 });
    const before = field.particles.map((p) => p.angle);
    stepOrbitField(field, 16);
    field.particles.forEach((p, i) => {
      const moved = Math.abs(p.angle - (before[i] ?? 0));
      expect(moved).toBeGreaterThan(0);
      expect(moved).toBeLessThan(0.01);
    });
  });

  it('every mark it draws stays within the luminance budget, and it never draws text', () => {
    const field = createOrbitField({ width: 1920, height: 1080, intensity: 1, seed: 2 });
    const { ctx, alphas } = recordingContext();
    drawOrbitField(ctx, field, colors);
    expect(alphas.length).toBeGreaterThan(0);
    for (const { alpha } of alphas) {
      expect(alpha * relativeLuminance(colors.accent ?? colors.line!)).toBeLessThanOrEqual(MAX_LUMINANCE_DELTA + 1e-9);
      expect(alpha * relativeLuminance(colors.line!)).toBeLessThanOrEqual(MAX_LUMINANCE_DELTA + 1e-9);
    }
  });
});
