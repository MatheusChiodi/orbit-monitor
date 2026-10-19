import type { AnimationLevel } from './animationLevel';
import { MOTION, type CubicBezier } from './tokens';

export const MOTION_KINDS = [
  'enter',
  'exit',
  'listItem',
  'hero',
  'status',
  'reorder',
  'expand',
  'dialog',
  'toast',
  'hover',
  'press',
  'drag',
] as const;
export type MotionKind = (typeof MOTION_KINDS)[number];

export type MotionTarget = Record<string, number | string>;

export interface MotionTransition {
  duration: number;
  ease?: CubicBezier;
  delay?: number;
}

/** Exit target; may carry its own (shorter, ease-in) transition. */
export interface MotionExit {
  [key: string]: number | string | MotionTransition | undefined;
  transition?: MotionTransition;
}

export interface MotionPreset {
  initial: MotionTarget | false;
  animate: MotionTarget;
  exit: MotionExit;
  transition: MotionTransition;
}

const OFF: MotionPreset = { initial: false, animate: {}, exit: {}, transition: { duration: 0 } };

function scaled(level: AnimationLevel, seconds: number): number {
  return Number((level === 'expressive' ? seconds * MOTION.expressiveScale : seconds).toFixed(4));
}

interface Shape {
  duration: number;
  from: MotionTarget;
  to: MotionTarget;
  leave: MotionTarget;
}

const ENTER: Shape = {
  duration: MOTION.duration.base,
  from: { opacity: 0, y: 6, scale: 0.98 },
  to: { opacity: 1, y: 0, scale: 1 },
  leave: { opacity: 0, scale: 0.98 },
};

/** Enter-like moments in their `standard` shape; `minimal` keeps only opacity. */
const SHAPES: Partial<Record<MotionKind, Shape>> = {
  enter: ENTER,
  exit: ENTER,
  listItem: { duration: MOTION.duration.base, from: { opacity: 0, y: MOTION.distance.sm }, to: { opacity: 1, y: 0 }, leave: { opacity: 0 } },
  hero: { duration: MOTION.duration.hero, from: { opacity: 0, scale: 0.98 }, to: { opacity: 1, scale: 1 }, leave: { opacity: 0, scale: 0.98 } },
  dialog: {
    duration: MOTION.duration.base,
    from: { opacity: 0, y: MOTION.distance.md },
    to: { opacity: 1, y: 0 },
    leave: { opacity: 0, y: MOTION.distance.md },
  },
  toast: {
    duration: MOTION.duration.fast,
    from: { opacity: 0, y: MOTION.distance.md },
    to: { opacity: 1, y: 0 },
    leave: { opacity: 0, y: MOTION.distance.md },
  },
  expand: { duration: MOTION.duration.base, from: { opacity: 0, height: 0 }, to: { opacity: 1, height: 'auto' }, leave: { opacity: 0, height: 0 } },
};

const MOVEMENT_KEYS = new Set(['x', 'y', 'scale']);

function onlyFades(target: MotionTarget): MotionTarget {
  return Object.fromEntries(Object.entries(target).filter(([k]) => !MOVEMENT_KEYS.has(k)));
}

/** Status colors (background, border, text) cross-fade; instant when off. */
export function statusTransition(level: AnimationLevel): MotionTransition {
  if (level === 'off') return { duration: 0 };
  return { duration: scaled(level, MOTION.duration.slow), ease: MOTION.ease.out };
}

/** Motion props for one moment at one animation level (docs/03-design.md §4.1). */
export function motionPreset(level: AnimationLevel, kind: MotionKind): MotionPreset {
  if (level === 'off') return OFF;
  const minimal = level === 'minimal';
  const shape = SHAPES[kind];
  if (shape) {
    const duration = scaled(level, shape.duration);
    const pick = minimal ? onlyFades : (t: MotionTarget) => t;
    return {
      initial: pick(shape.from),
      animate: pick(shape.to),
      exit: {
        ...pick(shape.leave),
        transition: { duration: Number((duration * MOTION.exitRatio).toFixed(4)), ease: MOTION.ease.in },
      },
      transition: { duration, ease: MOTION.ease.out },
    };
  }
  switch (kind) {
    case 'status':
      return { initial: false, animate: {}, exit: {}, transition: statusTransition(level) };
    case 'reorder':
      return { initial: false, animate: {}, exit: {}, transition: { duration: scaled(level, MOTION.duration.slow), ease: MOTION.ease.inOut } };
    case 'hover':
      return { initial: false, animate: {}, exit: {}, transition: { duration: scaled(level, MOTION.duration.instant) } };
    case 'press':
      return { initial: false, animate: minimal ? {} : { scale: 0.98 }, exit: {}, transition: { duration: scaled(level, MOTION.duration.instant) } };
    case 'drag':
      return { initial: false, animate: minimal ? {} : { scale: 1.02 }, exit: {}, transition: { duration: scaled(level, MOTION.duration.base) } };
    default:
      return OFF;
  }
}

/** 30 ms per item (45 ms expressive); no stagger above 8 items, nor in minimal/off. */
export function staggerDelay(level: AnimationLevel, index: number, count: number): number {
  if (level === 'off' || level === 'minimal' || count > MOTION.stagger.maxItems) return 0;
  const step = level === 'expressive' ? MOTION.stagger.expressiveStep : MOTION.stagger.step;
  return Number((index * step).toFixed(4));
}

/** The 600 ms tint flash behind a changed value (color only, so minimal keeps it). */
export function valueFlashTransition(level: AnimationLevel): { duration: number } | null {
  return level === 'off' ? null : { duration: MOTION.flashMs / 1000 };
}
