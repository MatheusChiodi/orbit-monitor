import type { ReactNode } from 'react';
import { m } from 'motion/react';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import { SOFT_CLASS, TEXT_CLASS, type Tone } from '../tones';

export interface BadgeProps {
  tone?: Tone;
  mono?: boolean;
  children: ReactNode;
  className?: string;
}

/** Small chip; enters and leaves (inside AnimatePresence) with the list-item preset. */
export function Badge({ tone = 'neutral', mono = false, children, className = '' }: BadgeProps) {
  const preset = useMotionPreset('listItem');
  return (
    <m.span
      initial={preset.initial}
      animate={preset.animate}
      exit={preset.exit}
      transition={preset.transition}
      data-motion-level={preset.level}
      data-tone={tone}
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium ${SOFT_CLASS[tone]} ${TEXT_CLASS[tone]} ${mono ? 'font-mono' : ''} ${className}`}
    >
      {children}
    </m.span>
  );
}
