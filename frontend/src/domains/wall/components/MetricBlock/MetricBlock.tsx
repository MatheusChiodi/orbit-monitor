import type { ReactNode } from 'react';
import type { Status } from '@/shared/api/types';
import { FlashValue, Panel, TEXT_CLASS } from '@/shared/ui';

export interface MetricBlockProps {
  title: string;
  /** Raw number used for the change flash (FE-51). */
  value: number | null;
  /** Already formatted and redacted text. */
  children: ReactNode;
  status?: Status;
  caption?: ReactNode;
}

/** Big single number (value and uptime blocks). */
export function MetricBlock({ title, value, children, status, caption }: MetricBlockProps) {
  return (
    <Panel title={title} tone={status === 'OK' ? undefined : status} className="h-full">
      <FlashValue value={value} className={`block font-display text-[2.6rem] font-bold tabular-nums ${status ? TEXT_CLASS[status] : ''}`}>
        {children}
      </FlashValue>
      {caption && <div className="mt-[0.3rem] text-[0.8rem] text-muted">{caption}</div>}
    </Panel>
  );
}
