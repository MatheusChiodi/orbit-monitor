import { useId, type ReactNode } from 'react';
import { m } from 'motion/react';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import type { Status } from '@/shared/api/types';
import { DOT_CLASS } from '../tones';

/** FE-60: panel/card surface; padding and shadow come from tokens the FE-56 controls change. */
export const PANEL_CLASS =
  'relative flex min-h-0 flex-col overflow-hidden rounded-md border border-line bg-s1 p-(--panel-padding) shadow-panel';

export interface PanelProps {
  title?: string;
  actions?: ReactNode;
  /** State that paints the side bar (used by the hero). */
  tone?: Status;
  /** Blinks the side bar (incident without an owner). */
  pulse?: boolean;
  /** Announces changes to screen readers. */
  live?: boolean;
  /** `glass` (FE-52) only takes effect from the standard FX level; `solid` opts out. */
  surface?: 'solid' | 'glass';
  className?: string;
  children: ReactNode;
}

export function Panel({ title, actions, tone, pulse = false, live = false, surface = 'glass', className = '', children }: PanelProps) {
  const titleId = useId();
  const preset = useMotionPreset('enter');
  const colors = preset.level === 'off' ? 'transition-none' : 'transition-colors duration-400';
  return (
    <m.section
      initial={preset.initial}
      animate={preset.animate}
      exit={preset.exit}
      transition={preset.transition}
      data-motion-level={preset.level}
      data-status={tone}
      aria-labelledby={title ? titleId : undefined}
      aria-live={live ? 'polite' : undefined}
      data-tone={tone}
      data-surface="panel"
      className={`${PANEL_CLASS} ${surface === 'glass' ? 'fx-glass' : ''} ${className}`}
    >
      {tone && (
        <span
          aria-hidden
          data-pulse={pulse ? 'true' : undefined}
          className={`absolute inset-y-0 left-0 w-1 ${DOT_CLASS[tone]} ${colors} ${pulse ? 'anim-blink' : ''}`}
        />
      )}
      {(title || actions) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && (
            <h2 id={titleId} className="section-label m-0">
              {title}
            </h2>
          )}
          {actions}
        </header>
      )}
      {children}
    </m.section>
  );
}
