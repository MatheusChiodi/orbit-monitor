import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Status } from '@/shared/api/types';
import { DOT_CLASS, SOFT_CLASS, TEXT_CLASS } from '../tones';

export interface StatusDotProps {
  status: Status;
  blink?: boolean;
  className?: string;
}

/** State dot with an accessible label, so state never depends on color alone. */
export function StatusDot({ status, blink = false, className = '' }: StatusDotProps) {
  const { t } = useTranslation();
  return (
    <span
      role="img"
      aria-label={t(`status.label.${status}`)}
      className={`inline-block size-[0.55rem] shrink-0 rounded-full ${DOT_CLASS[status]} ${blink ? 'anim-blink' : ''} ${className}`}
    />
  );
}

export interface StatusPillProps {
  status: Status;
  children?: ReactNode;
  className?: string;
}

/** State pill: dot + text. The dot blinks only in red. */
export function StatusPill({ status, children, className = '' }: StatusPillProps) {
  const { t } = useTranslation();
  return (
    <span
      data-status={status}
      className={`inline-flex items-center gap-[0.45rem] rounded-full border px-[0.75rem] py-[0.25rem] text-[0.85rem] font-semibold ${SOFT_CLASS[status]} ${TEXT_CLASS[status]} ${className}`}
    >
      <span aria-hidden className={`size-[0.55rem] rounded-full ${DOT_CLASS[status]} ${status === 'DOWN' ? 'anim-blink' : ''}`} />
      <span>{children ?? t(`status.label.${status}`)}</span>
    </span>
  );
}
