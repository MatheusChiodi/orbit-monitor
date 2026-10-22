import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { settingsFor, type MotionSettings } from './motionSettings';
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
  const initialY = preset.initial ? preset.initial.y : undefined;
  if (typeof initialY === 'number') summary.y = initialY;
  return summary;
}

const LevelContext = createContext<AnimationLevel>(DEFAULT_ANIMATION_LEVEL);
const SettingsContext = createContext<MotionSettings | null>(null);

export interface AnimationLevelProviderProps {
  level: AnimationLevel;
  /** FE-06 controls for this level (device overrides applied); defaults to the level's preset. */
  settings?: MotionSettings;
  /** Defaults to the system setting. */
  prefersReducedMotion?: boolean;
  children: ReactNode;
}

const onOff = (value: boolean) => (value ? 'on' : 'off');

export function AnimationLevelProvider({ level, settings, prefersReducedMotion, children }: AnimationLevelProviderProps) {
  const effective = effectiveAnimationLevel(level, prefersReducedMotion ?? systemPrefersReducedMotion());
  const resolved = effective === 'off' ? settingsFor('off') : (settings ?? settingsFor(effective));
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.animation = effective;
    // CSS-only signals (blink, flashes, hover lift) read these; theme.css turns them off.
    root.dataset.motionAttention = onOff(resolved.attention);
    root.dataset.motionFeedback = onOff(resolved.feedback);
    root.dataset.motionHover = onOff(resolved.hover);
    root.style.setProperty('--motion-speed', String(resolved.speed));
  }, [effective, resolved.attention, resolved.feedback, resolved.hover, resolved.speed]);
  return (
    <LevelContext.Provider value={effective}>
      <SettingsContext.Provider value={resolved}>{children}</SettingsContext.Provider>
    </LevelContext.Provider>
  );
}

/** FE-06 single source of truth; without a provider, the preset of the current level. */
export function useMotionSettings(): MotionSettings {
  const level = useContext(LevelContext);
  return useContext(SettingsContext) ?? settingsFor(level);
}

export interface AnimationLevelScopeProps {
  /** Already-effective level (callers apply `prefers-reduced-motion` first). */
  level: AnimationLevel;
  /** FE-06 controls for the subtree (live preview); defaults to the level's preset. */
  settings?: MotionSettings;
  children: ReactNode;
}

/** Overrides the level for a subtree only (e.g. static previews); no side effect on the document. */
export function AnimationLevelScope({ level, settings, children }: AnimationLevelScopeProps) {
  return (
    <LevelContext.Provider value={level}>
      <SettingsContext.Provider value={level === 'off' ? settingsFor('off') : (settings ?? settingsFor(level))}>{children}</SettingsContext.Provider>
    </LevelContext.Provider>
  );
}

export function useAnimationLevel(): AnimationLevel {
  return useContext(LevelContext);
}
