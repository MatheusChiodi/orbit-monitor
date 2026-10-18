import type { ReactNode } from 'react';
import type { Status } from '@/shared/api/types';
import { DOT_CLASS, SOFT_CLASS, STATUS_LABEL, TEXT_CLASS } from '../tones';

export interface StatusDotProps {
  status: Status;
  blink?: boolean;
  className?: string;
}

export function StatusDot({ status, blink = false, className = '' }: StatusDotProps) {
  return (
    <span
      role="img"
      aria-label={STATUS_LABEL[status]}
      className={`inline-block size-[0.55rem] shrink-0 rounded-full ${DOT_CLASS[status]} ${blink ? 'anim-blink' : ''} ${className}`}
    />
  );
}

export interface StatusPillProps {
  status: Status;
  children?: ReactNode;
  className?: string;
}

/** Pílula de estado: ponto + texto. O ponto só pisca em vermelho. */
export function StatusPill({ status, children, className = '' }: StatusPillProps) {
  return (
    <span
      data-status={status}
      className={`inline-flex items-center gap-[0.45rem] rounded-full border px-[0.75rem] py-[0.25rem] text-[0.85rem] font-semibold ${SOFT_CLASS[status]} ${TEXT_CLASS[status]} ${className}`}
    >
      <span aria-hidden className={`size-[0.55rem] rounded-full ${DOT_CLASS[status]} ${status === 'DOWN' ? 'anim-blink' : ''}`} />
      <span>{children ?? STATUS_LABEL[status]}</span>
    </span>
  );
}
