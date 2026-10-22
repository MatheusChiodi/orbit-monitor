import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';

/** FE-51: a console screen enters with the enter preset when the route changes (no exit overlap). */
export function ScreenTransition({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  const enter = useMotionPreset('enter');
  return (
    <motion.div
      key={routeKey}
      data-motion="enter"
      data-motion-level={enter.level}
      initial={enter.initial}
      animate={enter.animate}
      transition={enter.transition}
      className="flex flex-col gap-[1rem]"
    >
      {children}
    </motion.div>
  );
}
