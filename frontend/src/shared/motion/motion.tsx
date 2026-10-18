import type { ReactNode } from 'react';
import { MotionConfig, type Transition, type Variants } from 'motion/react';

/** Nada com mola, nada com deslocamento maior que 8 px (03-design.md, seção 4). */
export const MAX_OFFSET_PX = 8;
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const heroTransition: Transition = { duration: 0.35, ease: EASE_OUT };

export const heroVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
} satisfies Variants;

export const listItemVariants = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
} satisfies Variants;

export const layoutTransition: Transition = { duration: 0.35, ease: EASE_OUT };

/** Respeita prefers-reduced-motion em todas as animações do Motion. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
