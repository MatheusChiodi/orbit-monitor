import type { ComponentType } from '@/shared/customization/types';

/** FE-53 Names tab: labels each component type shows (renamed through FE-54). */
export const NAME_KEYS: Readonly<Record<ComponentType, readonly string[]>> = {
  'card.monitor': ['status.label.OK', 'status.label.WARN', 'status.label.DOWN', 'reading.noResponse', 'console.monitors.columns.state', 'console.monitors.columns.monitor', 'console.monitors.columns.value'],
  'card.group': ['status.groupSummary', 'console.monitors.empty', 'console.monitors.filter', 'wall.matrix.title'],
};
