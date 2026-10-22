import type { ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { Status } from '@/shared/api/types';
import { MOTION, useAnimationLevel, useMotionPreset } from '@/shared/motion';
import { useChangeSignal } from '@/shared/motion/useChangeSignal';
import { DOT_CLASS, SOFT_CLASS, TEXT_CLASS } from '../tones';

/** Status colors cross-fade in `duration.slow`; nothing transitions when the level is off. */
export function statusColorClass(level: string): string {
  return level === 'off' ? 'transition-none' : 'transition-colors duration-[400ms]';
}

export interface StatusDotProps {
  status: Status;
  blink?: boolean;
  className?: string;
}

/** State dot with an accessible label; one soft pulse when the state changes. */
export function StatusDot({ status, blink = false, className = '' }: StatusDotProps) {
  const { t } = useTranslation();
  const level = useAnimationLevel();
  const pulses = level === 'standard' || level === 'expressive';
  const pulse = useChangeSignal(status, pulses, MOTION.duration.slow * 2000);
  return (
    <span
      role="img"
      aria-label={t(`status.label.${status}`)}
      data-status={status}
      data-pulse={pulse ? 'once' : undefined}
      className={`inline-block size-[0.55rem] shrink-0 rounded-full ${DOT_CLASS[status]} ${statusColorClass(level)} ${blink ? 'anim-blink' : ''} ${pulse ? 'anim-pulse-once' : ''} ${className}`}
    />
  );
}

export interface StatusPillProps {
  status: Status;
  children?: ReactNode;
  className?: string;
}

/** State pill: dot + text. The dot blinks only in red; the label cross-fades on a change. */
export function StatusPill({ status, children, className = '' }: StatusPillProps) {
  const { t } = useTranslation();
  const fade = useMotionPreset('status');
  const label = children ?? t(`status.label.${status}`);
  const fadeIn = fade.level === 'off' ? false : { opacity: 0 };
  return (
    <span
      data-status={status}
      data-motion-level={fade.level}
      className={`inline-flex items-center gap-[0.45rem] rounded-full border px-[0.75rem] py-[0.25rem] text-[0.85rem] font-semibold ${SOFT_CLASS[status]} ${TEXT_CLASS[status]} ${statusColorClass(fade.level)} ${className}`}
    >
      <span
        aria-hidden
        className={`size-[0.55rem] rounded-full ${DOT_CLASS[status]} ${statusColorClass(fade.level)} ${status === 'DOWN' ? 'anim-blink' : ''}`}
      />
      <span className="inline-grid">
        <AnimatePresence initial={false}>
          <m.span
            key={`${status}:${typeof label === 'string' ? label : ''}`}
            className="[grid-area:1/1]"
            initial={fadeIn}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade.transition}
          >
            {label}
          </m.span>
        </AnimatePresence>
      </span>
    </span>
  );
}
