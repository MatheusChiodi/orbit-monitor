import { isAnimationLevel, type AnimationLevel } from './animationLevel';
import type { MotionKind, MotionPreset } from './presets';

/**
 * FE-06 animation settings (docs/05-extended-features.md §1.2): one source of truth that the FE-51
 * presets and the FE-52 FX layer read. A preset level sets every control; device overrides make it custom.
 */
export interface MotionSettings {
  /** 0..100 %: distance, scale, glow, particle density, 3D movement. */
  intensity: number;
  /** 0.5..1.5: multiplies every duration token. */
  speed: number;
  /** Enter, exit, expand, dialogs, toasts, reorder. */
  transitions: boolean;
  /** Status cross-fade, dot pulse, value flash, threshold fade. */
  feedback: boolean;
  /** DOWN-without-owner blink and hero glow. */
  attention: boolean;
  fx: 'off' | 'low' | 'high';
  background: boolean;
  intros: boolean;
  /** Hover tilt, press scale, drag lift. */
  hover: boolean;
}

export type MotionPresetName = AnimationLevel | 'custom';

const freeze = (s: MotionSettings) => Object.freeze(s);
export const MOTION_PRESETS: Readonly<Record<AnimationLevel, Readonly<MotionSettings>>> = Object.freeze({
  off: freeze({ intensity: 0, speed: 1, transitions: false, feedback: false, attention: false, fx: 'off', background: false, intros: false, hover: false }),
  minimal: freeze({ intensity: 25, speed: 1, transitions: true, feedback: true, attention: true, fx: 'off', background: false, intros: false, hover: false }),
  standard: freeze({ intensity: 60, speed: 1, transitions: true, feedback: true, attention: true, fx: 'low', background: true, intros: false, hover: true }),
  expressive: freeze({ intensity: 100, speed: 1.25, transitions: true, feedback: true, attention: true, fx: 'high', background: true, intros: true, hover: true }),
});

const BOOLEAN_KEYS = ['transitions', 'feedback', 'attention', 'background', 'intros', 'hover'] as const;
const FX_VALUES = ['off', 'low', 'high'] as const;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Keeps known controls with valid values; numbers are clamped to their range. */
export function sanitizeMotionOverrides(input: unknown): Partial<MotionSettings> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return {};
  const source = input as Record<string, unknown>;
  const out: Partial<MotionSettings> = {};
  if (typeof source.intensity === 'number' && Number.isFinite(source.intensity)) out.intensity = Math.round(clamp(source.intensity, 0, 100));
  if (typeof source.speed === 'number' && Number.isFinite(source.speed)) out.speed = Number(clamp(source.speed, 0.5, 1.5).toFixed(2));
  for (const key of BOOLEAN_KEYS) if (typeof source[key] === 'boolean') out[key] = source[key];
  if (FX_VALUES.some((v) => v === source.fx)) out.fx = source.fx as MotionSettings['fx'];
  return out;
}

export function settingsFor(level: AnimationLevel, overrides: Partial<MotionSettings> = {}): MotionSettings {
  if (level === 'off') return { ...MOTION_PRESETS.off };
  return { ...MOTION_PRESETS[level], ...sanitizeMotionOverrides(overrides) };
}

/** "custom" as soon as an override differs from its preset. */
export function presetName(level: AnimationLevel, overrides: Partial<MotionSettings>): MotionPresetName {
  const preset = MOTION_PRESETS[level];
  const clean = sanitizeMotionOverrides(overrides);
  const differs = (Object.keys(clean) as (keyof MotionSettings)[]).some((key) => clean[key] !== preset[key]);
  return differs ? 'custom' : level;
}

export function parseMotionParam(search: string): AnimationLevel | null {
  const value = new URLSearchParams(search).get('motion');
  return isAnimationLevel(value) ? value : null;
}

export interface MotionChoice {
  level: AnimationLevel;
  overrides?: Partial<MotionSettings>;
}

export interface MotionInputs {
  reducedMotion: boolean;
  url: AnimationLevel | null;
  layout?: MotionChoice | null;
  device?: MotionChoice | null;
  workspace?: MotionChoice | null;
}

export type MotionSource = 'reducedMotion' | 'url' | 'layout' | 'device' | 'workspace' | 'default';

export interface ResolvedMotion {
  level: AnimationLevel;
  settings: MotionSettings;
  source: MotionSource;
}

/** Precedence (highest first): reduced motion → `?motion=` → wall layout → device → workspace default. */
export function resolveMotion(inputs: MotionInputs): ResolvedMotion {
  if (inputs.reducedMotion) return { level: 'off', settings: settingsFor('off'), source: 'reducedMotion' };
  if (inputs.url) return { level: inputs.url, settings: settingsFor(inputs.url), source: 'url' };
  for (const source of ['layout', 'device', 'workspace'] as const) {
    const choice = inputs[source];
    if (choice) return { level: choice.level, settings: settingsFor(choice.level, choice.overrides), source };
  }
  return { level: 'standard', settings: settingsFor('standard'), source: 'default' };
}

const TRANSITION_KINDS: ReadonlySet<MotionKind> = new Set(['enter', 'exit', 'listItem', 'hero', 'reorder', 'expand', 'dialog', 'toast']);
const HOVER_KINDS: ReadonlySet<MotionKind> = new Set(['hover', 'press', 'drag']);
const INSTANT: MotionPreset = { initial: false, animate: {}, exit: {}, transition: { duration: 0 } };

function scaleDuration<T extends { duration?: number }>(value: T, factor: number): T {
  return typeof value.duration === 'number' ? { ...value, duration: Number((value.duration * factor).toFixed(4)) } : value;
}

/** Applies the switches and the speed to a FE-51 preset; `level` is the preset's own level. */
export function applyMotionSettings(preset: MotionPreset, kind: MotionKind, settings: MotionSettings, level: AnimationLevel): MotionPreset {
  if (level === 'off') return preset;
  if (TRANSITION_KINDS.has(kind) && !settings.transitions) return INSTANT;
  if (kind === 'status' && !settings.feedback) return INSTANT;
  if (HOVER_KINDS.has(kind) && !settings.hover) return INSTANT;
  const factor = settings.speed / MOTION_PRESETS[level].speed;
  if (factor === 1) return preset;
  const exit = preset.exit && typeof preset.exit === 'object' && 'transition' in preset.exit && preset.exit.transition
    ? { ...preset.exit, transition: scaleDuration(preset.exit.transition as { duration?: number }, factor) }
    : preset.exit;
  return { ...preset, exit, transition: scaleDuration(preset.transition, factor) };
}

/** FE-52 level for the 3D / FX control (the FX layer still honors reduced motion and downgrades). */
export function fxLevelFor(settings: MotionSettings, level: AnimationLevel): AnimationLevel {
  if (level === 'off') return 'off';
  return settings.fx === 'high' ? 'expressive' : settings.fx === 'low' ? 'standard' : 'minimal';
}

