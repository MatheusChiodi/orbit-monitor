import { useId, type ReactNode } from 'react';
import type { Status } from '@/shared/api/types';
import { DOT_CLASS } from '../tones';

export interface PanelProps {
  title?: string;
  actions?: ReactNode;
  /** Estado que pinta a barra lateral de 0.35 rem (usada no herói). */
  tone?: Status;
  /** Pisca a barra lateral (incidente sem responsável). */
  pulse?: boolean;
  /** Anuncia mudanças a leitores de tela. */
  live?: boolean;
  className?: string;
  children: ReactNode;
}

export function Panel({ title, actions, tone, pulse = false, live = false, className = '', children }: PanelProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      aria-live={live ? 'polite' : undefined}
      data-tone={tone}
      className={`relative flex min-h-0 flex-col overflow-hidden rounded-[0.9rem] border border-line bg-s1 p-[0.9rem] ${className}`}
    >
      {tone && (
        <span
          aria-hidden
          data-pulse={pulse ? 'true' : undefined}
          className={`absolute inset-y-0 left-0 w-[0.35rem] ${DOT_CLASS[tone]} ${pulse ? 'anim-blink' : ''}`}
        />
      )}
      {(title || actions) && (
        <header className="mb-[0.6rem] flex items-center justify-between gap-2">
          {title && (
            <h2 id={titleId} className="section-label m-0">
              {title}
            </h2>
          )}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
