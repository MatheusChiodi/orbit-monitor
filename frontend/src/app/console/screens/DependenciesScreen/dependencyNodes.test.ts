import { describe, expect, it } from 'vitest';
import { createsCycle, toGraph } from './dependencyNodes';

const groups = [{ id: 'bus', name: 'Service bus' }, { id: 'pay', name: 'Payments' }, { id: 'idle', name: 'Idle' }];
const monitors = [
  { id: 'm1', name: 'Checkout', groupId: 'pay', type: 'HTTP' as const, status: 'DOWN' as const, value: null, since: '' },
  { id: 'm2', name: 'Queue', groupId: 'bus', type: 'SQL' as const, status: 'OK' as const, value: null, since: '' },
];

describe('FE-42 dependency graph data', () => {
  it('builds nodes for every referenced group or monitor with its state; unknown ids keep their id', () => {
    const graph = toGraph(
      [
        { id: 'd1', upstream: 'bus', downstream: 'pay' },
        { id: 'd2', upstream: 'pay', downstream: 'm1' },
        { id: 'd3', upstream: 'ghost', downstream: 'pay' },
      ],
      groups,
      monitors,
    );
    expect(graph.nodes).toEqual([
      { id: 'bus', label: 'Service bus', status: 'OK' },
      { id: 'pay', label: 'Payments', status: 'DOWN' },
      { id: 'm1', label: 'Checkout', status: 'DOWN' },
      { id: 'ghost', label: 'ghost', status: 'OK' },
    ]);
    expect(graph.edges).toEqual([
      { from: 'bus', to: 'pay' },
      { from: 'pay', to: 'm1' },
      { from: 'ghost', to: 'pay' },
    ]);
  });

  it('detects a dependency that would close a cycle', () => {
    const edges = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }];
    expect(createsCycle(edges, 'c', 'a')).toBe(true);
    expect(createsCycle(edges, 'a', 'c')).toBe(false);
    expect(createsCycle(edges, 'a', 'a')).toBe(true);
  });
});
