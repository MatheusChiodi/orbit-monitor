import type { MotionSettings } from '@/shared/motion/motionSettings';
/** Visual FX levels mirror the animation levels of FE-06 (docs/05-extended-features.md §1.2). */
export const FX_LEVELS = ['off', 'minimal', 'standard', 'expressive'] as const;
export type FxLevel = (typeof FX_LEVELS)[number];

export interface FxInputs {
  level: FxLevel;
  reducedMotion: boolean;
  /** An unacknowledged DOWN incident is on screen. */
  incidentActive: boolean;
  /** The frame monitor stepped FX down because frames were too slow. */
  downgraded: boolean;
}

export interface FxState {
  level: FxLevel;
  /** 0..1, scales glow strength, particle density and 3D movement. */
  intensity: number;
  orb: boolean;
  glass: boolean;
  tilt: boolean;
  tiltMaxDeg: number;
  background: 'static' | 'low' | 'full';
  backgroundPaused: boolean;
  intros: boolean;
  downGlow: 'none' | 'static' | 'pulse';
}

const INTENSITY: Record<FxLevel, number> = { off: 0, minimal: 0.25, standard: 0.6, expressive: 1 };

export function parseFxLevel(value: string | null | undefined): FxLevel | null {
  return FX_LEVELS.find((level) => level === value) ?? null;
}

function effectiveLevel({ level, reducedMotion, downgraded }: FxInputs): FxLevel {
  if (reducedMotion) return 'off';
  if (downgraded && (level === 'standard' || level === 'expressive')) return 'minimal';
  return level;
}

/** Single place that decides which effects run (docs/03-design.md §4.2, "Rules"). */
export function resolveFx(inputs: FxInputs): FxState {
  const level = effectiveLevel(inputs);
  const rich = level === 'standard' || level === 'expressive';
  return {
    level,
    intensity: INTENSITY[level],
    orb: rich,
    glass: rich,
    tilt: rich,
    tiltMaxDeg: level === 'expressive' ? 4 : rich ? 2.5 : 0,
    background: level === 'expressive' ? 'full' : rich ? 'low' : 'static',
    backgroundPaused: inputs.incidentActive,
    intros: level === 'expressive',
    downGlow: level === 'off' ? 'none' : level === 'minimal' ? 'static' : 'pulse',
  };
}

const INTENSITY_CAP: Record<FxLevel, number> = { off: 0, minimal: 0.25, standard: 1, expressive: 1 };

/**
 * FE-06 controls on top of the FX level: the background and intros switches act on their own and the
 * intensity comes from the settings. They only restrict: nothing the level (or reduced motion) turned off
 * comes back, and `minimal` keeps its low ceiling.
 */
export function applyFxSettings(fx: FxState, settings: Pick<MotionSettings, 'intensity' | 'background' | 'intros'>): FxState {
  if (fx.level === 'off') return fx;
  const rich = fx.level === 'standard' || fx.level === 'expressive';
  return {
    ...fx,
    intensity: Math.min(INTENSITY_CAP[fx.level], Math.max(0, settings.intensity) / 100),
    background: settings.background ? fx.background : 'static',
    intros: rich && settings.intros,
  };
}
