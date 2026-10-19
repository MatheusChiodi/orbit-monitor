import {
  effectiveAnimationLevel,
  systemPrefersReducedMotion,
  useAnimationLevel,
  type AnimationLevel,
} from '@/shared/motion';

/** The mode's own `animation` prop wins over the app level; `prefers-reduced-motion` always forces `off`. */
export function useVizLevel(requested?: AnimationLevel): AnimationLevel {
  const appLevel = useAnimationLevel();
  return effectiveAnimationLevel(requested ?? appLevel, systemPrefersReducedMotion());
}

/** Static transition classes per level (Tailwind needs full strings). Only transform, opacity and colors move. */
const MARK_TRANSITION: Record<AnimationLevel, string> = {
  off: 'transition-none',
  minimal: 'transition-[opacity,fill,stroke,background-color] duration-[280ms]',
  standard: 'transition-[transform,opacity,fill,stroke,background-color] duration-[280ms] ease-[cubic-bezier(.2,.8,.2,1)]',
  expressive: 'transition-[transform,opacity,fill,stroke,background-color] duration-[350ms] ease-[cubic-bezier(.2,.8,.2,1)]',
};

export function markTransition(level: AnimationLevel): string {
  return MARK_TRANSITION[level];
}
