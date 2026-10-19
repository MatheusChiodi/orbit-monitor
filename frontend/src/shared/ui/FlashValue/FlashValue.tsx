import type { ReactNode } from 'react';
import { useValueFlash } from '@/shared/motion/useValueFlash';

export interface FlashValueProps {
  /** Numeric value used to detect the direction of a change. */
  value: number | null | undefined;
  children: ReactNode;
  className?: string;
}

/** A value that swaps in place (tabular, no counting) with a 600 ms tint flash in the direction color. */
export function FlashValue({ value, children, className = '' }: FlashValueProps) {
  const flash = useValueFlash(value);
  return (
    <span data-flash={flash ?? undefined} className={`${className} ${flash ? `anim-flash-${flash}` : ''}`}>
      {children}
    </span>
  );
}
