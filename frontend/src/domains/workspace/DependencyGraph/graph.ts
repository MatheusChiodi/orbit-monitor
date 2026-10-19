export interface Edge {
  from: string;
  to: string;
}

/** Everything downstream of `id`, in breadth-first order (cycle safe). */
export function impactRadius(edges: readonly Edge[], id: string): Set<string> {
  const result = new Set<string>();
  const queue = [id];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.from !== current || edge.to === id || result.has(edge.to)) continue;
      result.add(edge.to);
      queue.push(edge.to);
    }
  }
  return result;
}

export interface NodePosition {
  column: number;
  row: number;
}

/** Layered layout: a node's column is its longest upstream path; rows keep input order. */
export function layoutGraph(nodes: readonly { id: string }[], edges: readonly Edge[]): Map<string, NodePosition> {
  const column = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  // Relax at most nodes.length times so cycles cannot loop forever.
  for (let i = 0; i < nodes.length; i += 1) {
    let changed = false;
    for (const edge of edges) {
      const next = (column.get(edge.from) ?? 0) + 1;
      if (column.has(edge.to) && next > (column.get(edge.to) ?? 0) && next < nodes.length) {
        column.set(edge.to, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const rows = new Map<number, number>();
  const positions = new Map<string, NodePosition>();
  for (const node of nodes) {
    const c = column.get(node.id) ?? 0;
    const row = rows.get(c) ?? 0;
    rows.set(c, row + 1);
    positions.set(node.id, { column: c, row });
  }
  return positions;
}
