import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { motionPreset, type MotionKind } from './presets';

/** FE-06: `prefers-reduced-motion` is a hard ceiling that forces `off`. */
export const ANIMATION_LEVELS = ['off', 'minimal', 'standard', 'expressive'] as const;
export type AnimationLevel = (typeof ANIMATION_LEVELS)[number];
export const DEFAULT_ANIMATION_LEVEL: AnimationLevel = 'standard';

export function isAnimationLevel(value: unknown): value is AnimationLevel {
  return typeof value === 'string' && (ANIMATION_LEVELS as readonly string[]).includes(value);
}

export function effectiveAnimationLevel(level: AnimationLevel, prefersReducedMotion: boolean): AnimationLevel {
  return prefersReducedMotion ? 'off' : level;
}

export function systemPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

export interface TransitionSummary {
  duration: number;
  ease?: readonly number[];
  y?: number;
}

/** Compact view of a preset: duration, easing and initial vertical offset. */
export function transitionFor(level: AnimationLevel, kind: MotionKind): TransitionSummary {
  if (level === 'off') return { duration: 0 };
  const preset = motionPreset(level, kind);
  const summary: TransitionSummary = { duration: preset.transition.duration };
  if (preset.transition.ease) summary.ease = preset.transition.ease;
  if (preset.initial && typeof preset.initial.y === 'number') summary.y = preset.initial.y;
  return summary;
}

const LevelContext = createContext<AnimationLevel>(DEFAULT_ANIMATION_LEVEL);

export interface AnimationLevelProviderProps {
  level: AnimationLevel;
  /** Defaults to the system setting. */
  prefersReducedMotion?: boolean;
  children: ReactNode;
}

export function AnimationLevelProvider({ level, prefersReducedMotion, children }: AnimationLevelProviderProps) {
  const effective = effectiveAnimationLevel(level, prefersReducedMotion ?? systemPrefersReducedMotion());
  useEffect(() => {
    document.documentElement.dataset.animation = effective;
  }, [effective]);
  return <LevelContext.Provider value={effective}>{children}</LevelContext.Provider>;
}

export function useAnimationLevel(): AnimationLevel {
  return useContext(LevelContext);
}
