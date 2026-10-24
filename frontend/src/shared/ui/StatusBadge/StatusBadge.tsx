import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnimationLevel } from '@/shared/motion/animationLevel';
import { DOT_CLASS, TEXT_CLASS, type Tone } from '../tones';

export interface StatusBadgeProps {
  status: Tone;
  /** Overrides the status word (e.g. "Paused" on a neutral badge). */
  children?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * The one console rendering of a state: colored dot + word in sentence case. Color always comes with
 * the word (never color alone); only Down pulses. The wall keeps its uppercase StatusPill.
 */
export function StatusBadge({ status, children, size = 'md', className = '' }: StatusBadgeProps) {
  const { t } = useTranslation();
  const level = useAnimationLevel();
  const fade = level === 'off' ? 'transition-none' : 'transition-colors duration-400';
  return (
    <span
      data-status={status}
      className={`inline-flex items-center gap-1.5 font-medium whitespace-nowrap ${size === 'sm' ? 'text-xs' : 'text-sm'} ${TEXT_CLASS[status]} ${fade} ${className}`}
    >
      <span
        aria-hidden
        data-dot
        className={`size-2 shrink-0 rounded-full ${DOT_CLASS[status]} ${fade} ${status === 'DOWN' ? 'anim-blink' : ''}`}
      />
      {children ?? t(`ui.status.${status}`)}
    </span>
  );
}
