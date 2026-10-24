import type { ReactNode } from 'react';
import type { Status } from '@/shared/api/types';
import { FlashValue } from '@/shared/ui/FlashValue';
import { Panel } from '@/shared/ui/Panel';
import { TEXT_CLASS } from '@/shared/ui/tones';

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
      <FlashValue value={value} className={`display-wide tabular block text-2xl ${status ? TEXT_CLASS[status] : ''}`}>
        {children}
      </FlashValue>
      {caption && <div className="mt-1 text-sm text-muted">{caption}</div>}
    </Panel>
  );
}
