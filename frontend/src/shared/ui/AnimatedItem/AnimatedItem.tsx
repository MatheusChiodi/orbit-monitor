import { m, type HTMLMotionProps } from 'motion/react';
import { staggerDelay } from '@/shared/motion/presets';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';

const ELEMENTS = { li: m.li, tr: m.tr, div: m.div } as const;

export interface AnimatedItemProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'exit' | 'transition'> {
  /** Element to render: list item (default), table row or block. */
  as?: keyof typeof ELEMENTS;
  /** `reorder` items also animate their position (exceptions first, drag and drop). */
  motionKind?: 'listItem' | 'reorder';
  index?: number;
  count?: number;
}

/**
 * Item with the FE-51 list preset: enters with a small fade/translate (staggered for short lists),
 * leaves through the parent's `AnimatePresence`, and reorders with an ease-in-out layout transition.
 */
export function AnimatedItem({ as = 'li', motionKind = 'listItem', index = 0, count = 0, children, ...rest }: AnimatedItemProps) {
  const item = useMotionPreset('listItem');
  const reorder = useMotionPreset('reorder');
  const level = item.level;
  const delay = item.transition.duration === 0 ? 0 : staggerDelay(level, index, count);
  const Element = ELEMENTS[as] as typeof m.div;
  return (
    <Element
      {...rest}
      layout={motionKind === 'reorder' && reorder.transition.duration > 0 ? 'position' : false}
      data-motion={motionKind}
      data-motion-level={level}
      initial={item.initial}
      animate={item.animate}
      exit={item.exit}
      transition={{ ...item.transition, delay, layout: reorder.transition }}
    >
      {children}
    </Element>
  );
}
