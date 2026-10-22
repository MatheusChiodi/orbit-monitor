import { impactRadius, type GraphEdge, type GraphNode } from '@/domains/workspace/DependencyGraph';
import { worstStatus } from '@/domains/monitor/status';
import type { DependencyItem } from '@/shared/api/consoleTypes';
import type { Group, MonitorView } from '@/shared/api/types';

/** Nodes are the groups and monitors named in `orbit.dependencies.json`; a group shows its worst member state. */
export function toGraph(
  items: readonly DependencyItem[],
  groups: readonly Group[],
  monitors: readonly MonitorView[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const ids: string[] = [];
  for (const item of items) for (const id of [item.upstream, item.downstream]) if (!ids.includes(id)) ids.push(id);
  const nodes = ids.map((id): GraphNode => {
    const monitor = monitors.find((m) => m.id === id);
    if (monitor) return { id, label: monitor.name, status: monitor.status };
    const group = groups.find((g) => g.id === id);
    if (group) return { id, label: group.name, status: worstStatus(monitors.filter((m) => m.groupId === id).map((m) => m.status)) };
    return { id, label: id, status: 'OK' };
  });
  return { nodes, edges: items.map((item) => ({ from: item.upstream, to: item.downstream })) };
}

/** True when `upstream → downstream` would close a cycle (the backend rejects those too, BE-30). */
export function createsCycle(edges: readonly GraphEdge[], upstream: string, downstream: string): boolean {
  return upstream === downstream || impactRadius(edges, downstream).has(upstream);
}
