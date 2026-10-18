import type { ConfigFile, ConfigResource } from '@/shared/api/configResources';
import type { Group, MonitorView, Status } from '@/shared/api/types';
import { worstStatus } from '@/domains/monitor/status';

/** A group as stored in `orbit.groups.json`. */
export interface GroupConfig extends Group {
  order?: number;
  owner?: string;
  tags?: string[];
  description?: string;
  maintenance?: boolean;
}

export interface GroupSource {
  list: (resource: ConfigResource) => Promise<ConfigFile>;
}

/** Loads the groups in their configured order; a missing file means no groups yet. */
export async function loadGroups(source: GroupSource): Promise<GroupConfig[]> {
  const file = await source.list('groups');
  const groups = file.items as unknown as GroupConfig[];
  return [...groups].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
}

export type GroupState = Status | 'MAINTENANCE' | 'EMPTY';

/** Group state = worst state of its monitors; a group in maintenance stays neutral. */
export function groupStates(groups: readonly GroupConfig[], monitors: readonly MonitorView[]): Record<string, GroupState> {
  const states: Record<string, GroupState> = {};
  for (const group of groups) {
    const own = monitors.filter((m) => m.groupId === group.id);
    if (group.maintenance) states[group.id] = 'MAINTENANCE';
    else if (own.length === 0) states[group.id] = 'EMPTY';
    else states[group.id] = worstStatus(own.map((m) => m.status));
  }
  return states;
}
