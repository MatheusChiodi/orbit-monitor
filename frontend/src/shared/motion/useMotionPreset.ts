import { useAnimationLevel, useMotionSettings, type AnimationLevel } from './animationLevel';
import { applyMotionSettings } from './motionSettings';
import { motionPreset, type MotionKind, type MotionPreset } from './presets';

export { useMotionSettings };

/** Preset for the current animation level and FE-06 settings; spread `initial/animate/exit/transition`. */
export function useMotionPreset(kind: MotionKind): MotionPreset & { level: AnimationLevel } {
  const level = useAnimationLevel();
  const settings = useMotionSettings();
  return { ...applyMotionSettings(motionPreset(level, kind), kind, settings, level), level };
}
