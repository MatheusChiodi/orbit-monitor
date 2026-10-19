import { useAnimationLevel, type AnimationLevel } from './animationLevel';
import { motionPreset, type MotionKind, type MotionPreset } from './presets';

/** Preset for the current animation level; spread `initial/animate/exit/transition` on a motion element. */
export function useMotionPreset(kind: MotionKind): MotionPreset & { level: AnimationLevel } {
  const level = useAnimationLevel();
  return { ...motionPreset(level, kind), level };
}
