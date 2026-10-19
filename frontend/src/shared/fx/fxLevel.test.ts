import { describe, expect, it } from 'vitest';
import { FX_LEVELS, parseFxLevel, resolveFx, type FxInputs } from './fxLevel';

const base: FxInputs = { level: 'standard', reducedMotion: false, incidentActive: false, downgraded: false };

describe('FE-52 FX level', () => {
  it('follows the four animation levels', () => {
    expect(FX_LEVELS).toEqual(['off', 'minimal', 'standard', 'expressive']);
  });

  it('prefers-reduced-motion forces off for every level', () => {
    for (const level of FX_LEVELS) {
      const fx = resolveFx({ ...base, level, reducedMotion: true });
      expect(fx.level).toBe('off');
      expect(fx.orb).toBe(false);
      expect(fx.background).toBe('static');
    }
  });

  it('off and minimal: no 3D, no particles, no glass, no tilt, no intros', () => {
    for (const level of ['off', 'minimal'] as const) {
      const fx = resolveFx({ ...base, level });
      expect(fx).toMatchObject({ orb: false, glass: false, tilt: false, intros: false, background: 'static' });
    }
  });

  it('standard: orb, glass and a low-intensity background; no intros', () => {
    expect(resolveFx(base)).toMatchObject({ orb: true, glass: true, tilt: true, background: 'low', intros: false });
  });

  it('expressive: full background, tilt and Remotion intros', () => {
    expect(resolveFx({ ...base, level: 'expressive' })).toMatchObject({
      orb: true,
      glass: true,
      tilt: true,
      background: 'full',
      intros: true,
    });
  });

  it('hover tilt never exceeds 4 degrees', () => {
    for (const level of FX_LEVELS) expect(resolveFx({ ...base, level }).tiltMaxDeg).toBeLessThanOrEqual(4);
    expect(resolveFx({ ...base, level: 'expressive' }).tiltMaxDeg).toBe(4);
  });

  it('an unacknowledged DOWN incident pauses the background motion', () => {
    expect(resolveFx({ ...base, incidentActive: true }).backgroundPaused).toBe(true);
    expect(resolveFx(base).backgroundPaused).toBe(false);
  });

  it('frame-time downgrade steps standard and expressive down to minimal', () => {
    expect(resolveFx({ ...base, level: 'expressive', downgraded: true }).level).toBe('minimal');
    expect(resolveFx({ ...base, downgraded: true }).orb).toBe(false);
    expect(resolveFx({ ...base, level: 'off', downgraded: true }).level).toBe('off');
  });

  it('DOWN glow: none when off, static when minimal, pulse from standard', () => {
    expect(resolveFx({ ...base, level: 'off' }).downGlow).toBe('none');
    expect(resolveFx({ ...base, level: 'minimal' }).downGlow).toBe('static');
    expect(resolveFx(base).downGlow).toBe('pulse');
  });

  it('parses ?motion= and rejects unknown values', () => {
    expect(parseFxLevel('expressive')).toBe('expressive');
    expect(parseFxLevel('turbo')).toBeNull();
    expect(parseFxLevel(null)).toBeNull();
  });
});
