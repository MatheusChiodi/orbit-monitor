import { describe, expect, it } from 'vitest';
import { motionPreset } from './presets';
import {
  MOTION_PRESETS,
  applyMotionSettings,
  fxLevelFor,
  parseMotionParam,
  presetName,
  resolveMotion,
  sanitizeMotionOverrides,
  settingsFor,
} from './motionSettings';

describe('FE-06 motion settings (§1.2)', () => {
  it('presets map to the documented controls', () => {
    expect(MOTION_PRESETS.off).toMatchObject({ intensity: 0, transitions: false, feedback: false, attention: false, fx: 'off', background: false, hover: false });
    expect(MOTION_PRESETS.minimal).toMatchObject({ intensity: 25, speed: 1, transitions: true, feedback: true, attention: true, fx: 'off', background: false, intros: false, hover: false });
    expect(MOTION_PRESETS.standard).toMatchObject({ intensity: 60, speed: 1, fx: 'low', background: true, intros: false, hover: true });
    expect(MOTION_PRESETS.expressive).toMatchObject({ intensity: 100, speed: 1.25, fx: 'high', intros: true });
  });

  it('device overrides on top of a preset make it "custom"', () => {
    expect(presetName('standard', {})).toBe('standard');
    expect(presetName('standard', { intensity: 60 })).toBe('standard');
    expect(presetName('standard', { speed: 0.5 })).toBe('custom');
    expect(settingsFor('standard', { speed: 0.5, attention: false })).toMatchObject({ speed: 0.5, attention: false, fx: 'low' });
  });

  it('sanitizes stored overrides (ranges, types, unknown keys dropped)', () => {
    expect(sanitizeMotionOverrides({ intensity: 140, speed: 0.2, fx: 'ultra', hover: 'yes', secret: 'x', transitions: false })).toEqual({
      intensity: 100,
      speed: 0.5,
      transitions: false,
    });
    expect(sanitizeMotionOverrides('nope')).toEqual({});
  });

  it('precedence: reduced motion → URL → layout → device → workspace', () => {
    expect(resolveMotion({ reducedMotion: true, url: 'expressive', device: { level: 'expressive' } })).toMatchObject({ level: 'off', source: 'reducedMotion' });
    expect(resolveMotion({ reducedMotion: false, url: 'minimal', layout: { level: 'expressive' }, device: { level: 'standard' } })).toMatchObject({ level: 'minimal', source: 'url' });
    expect(resolveMotion({ reducedMotion: false, url: null, layout: { level: 'minimal' }, device: { level: 'expressive' } })).toMatchObject({ level: 'minimal', source: 'layout' });
    expect(resolveMotion({ reducedMotion: false, url: null, device: { level: 'expressive', overrides: { speed: 0.75 } }, workspace: { level: 'minimal' } })).toMatchObject({
      level: 'expressive',
      source: 'device',
      settings: expect.objectContaining({ speed: 0.75 }),
    });
    expect(resolveMotion({ reducedMotion: false, url: null, workspace: { level: 'minimal' } })).toMatchObject({ level: 'minimal', source: 'workspace' });
    expect(resolveMotion({ reducedMotion: false, url: null })).toMatchObject({ level: 'standard', source: 'default' });
  });

  it('?motion= accepts the four levels only', () => {
    expect(parseMotionParam('?motion=off')).toBe('off');
    expect(parseMotionParam('?motion=wild')).toBeNull();
    expect(parseMotionParam('')).toBeNull();
  });

  it('transitions off: component moments become instant; status feedback is separate', () => {
    const settings = settingsFor('standard', { transitions: false });
    expect(applyMotionSettings(motionPreset('standard', 'enter'), 'enter', settings, 'standard')).toEqual(motionPreset('off', 'enter'));
    expect(applyMotionSettings(motionPreset('standard', 'status'), 'status', settings, 'standard').transition.duration).toBeGreaterThan(0);
  });

  it('feedback off silences status cross-fades; hover off silences hover, press and drag', () => {
    const settings = settingsFor('standard', { feedback: false, hover: false });
    expect(applyMotionSettings(motionPreset('standard', 'status'), 'status', settings, 'standard').transition.duration).toBe(0);
    expect(applyMotionSettings(motionPreset('standard', 'press'), 'press', settings, 'standard').animate).toEqual({});
  });

  it('speed multiplies durations relative to the preset (0.5× is twice as fast)', () => {
    const base = motionPreset('standard', 'enter');
    const fast = applyMotionSettings(base, 'enter', settingsFor('standard', { speed: 0.5 }), 'standard');
    expect(fast.transition.duration).toBeCloseTo(base.transition.duration * 0.5);
    const same = applyMotionSettings(motionPreset('expressive', 'enter'), 'enter', settingsFor('expressive'), 'expressive');
    expect(same).toEqual(motionPreset('expressive', 'enter'));
  });

  it('3D / FX control drives the FX layer level', () => {
    expect(fxLevelFor(settingsFor('standard'), 'standard')).toBe('standard');
    expect(fxLevelFor(settingsFor('standard', { fx: 'high' }), 'standard')).toBe('expressive');
    expect(fxLevelFor(settingsFor('expressive', { fx: 'off' }), 'expressive')).toBe('minimal');
    expect(fxLevelFor(settingsFor('off'), 'off')).toBe('off');
  });
});
