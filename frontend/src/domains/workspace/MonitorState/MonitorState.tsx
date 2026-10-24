import { useTranslation } from 'react-i18next';
import type { MonitorView } from '@/shared/api/types';
import { StatusBadge } from '@/shared/ui';

/** What the console shows for a monitor: its state, or why it has none (paused, not checked yet). */
export type MonitorState = 'OK' | 'WARN' | 'DOWN' | 'WAITING' | 'PAUSED';

/** A paused monitor reads "Paused"; a state the console does not know (e.g. `UNKNOWN` before the first check) reads "Waiting". */
export function monitorState(monitor: Pick<MonitorView, 'status' | 'paused'>): MonitorState {
  if (monitor.paused) return 'PAUSED';
  const status = monitor.status as string;
  return status === 'OK' || status === 'WARN' || status === 'DOWN' ? status : 'WAITING';
}

export interface MonitorStateBadgeProps {
  monitor: Pick<MonitorView, 'status' | 'paused'>;
  size?: 'sm' | 'md';
}

/** StatusBadge for a monitor, with neutral "Paused" and "Waiting for first check" states. */
export function MonitorStateBadge({ monitor, size }: MonitorStateBadgeProps) {
  const { t } = useTranslation();
  const state = monitorState(monitor);
  if (state === 'PAUSED' || state === 'WAITING') {
    return (
      <StatusBadge status="neutral" size={size}>
        {t(state === 'PAUSED' ? 'ops.monitors.state.paused' : 'ops.monitors.state.waiting')}
      </StatusBadge>
    );
  }
  return <StatusBadge status={state} size={size} />;
}
