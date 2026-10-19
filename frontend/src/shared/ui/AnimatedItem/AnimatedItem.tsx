import { motion, type HTMLMotionProps } from 'motion/react';
import { motionPreset, staggerDelay } from '@/shared/motion/presets';
import { useAnimationLevel } from '@/shared/motion/animationLevel';

export interface AnimatedItemProps extends Omit<HTMLMotionProps<'li'>, 'initial' | 'animate' | 'exit' | 'transition'> {
  /** `reorder` items also animate their position (exceptions first, drag and drop). */
  motionKind?: 'listItem' | 'reorder';
  index?: number;
  count?: number;
}

/**
 * List item with the FE-51 list preset: enters with a small fade/translate (staggered for short lists),
 * leaves through the parent's `AnimatePresence`, and reorders with an ease-in-out layout transition.
 */
export function AnimatedItem({ motionKind = 'listItem', index = 0, count = 0, children, ...rest }: AnimatedItemProps) {
  const level = useAnimationLevel();
  const item = motionPreset(level, 'listItem');
  const reorder = motionPreset(level, 'reorder');
  const delay = staggerDelay(level, index, count);
  return (
    <motion.li
      {...rest}
      layout={motionKind === 'reorder' && level !== 'off' ? 'position' : false}
      data-motion={motionKind}
      data-motion-level={level}
      initial={item.initial}
      animate={item.animate}
      exit={item.exit}
      transition={{ ...item.transition, delay, layout: reorder.transition }}
    >
      {children}
    </motion.li>
  );
}
