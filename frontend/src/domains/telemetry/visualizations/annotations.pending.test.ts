import { describe, expect, it } from 'vitest';
import { annotationsInRange, type ChartAnnotation } from './annotations';

const list: ChartAnnotation[] = [
  { id: 'i1', kind: 'incident', at: '2026-10-18T17:05:00Z', title: 'Reconciliation queue down' },
  { id: 'm1', kind: 'maintenance', at: '2026-10-18T15:00:00Z', until: '2026-10-18T15:30:00Z', title: 'Core DB patch' },
  { id: 'd1', kind: 'deploy', at: '2026-10-17T10:00:00Z', title: 'checkout v2.4.1' },
];

describe('FE-26 chart annotations (pure)', () => {
  it('keeps only annotations inside the visible range, oldest first', () => {
    const visible = annotationsInRange(list, '2026-10-18T14:00:00Z', '2026-10-18T18:00:00Z');
    expect(visible.map((a) => a.id)).toEqual(['m1', 'i1']);
  });

  it('a maintenance window overlapping the range edge is kept and clipped', () => {
    const [window] = annotationsInRange(list, '2026-10-18T15:10:00Z', '2026-10-18T18:00:00Z');
    expect(window).toMatchObject({ id: 'm1', at: '2026-10-18T15:10:00Z', until: '2026-10-18T15:30:00Z' });
  });

  it('masks card numbers in annotation titles (PCI DSS)', () => {
    const [a] = annotationsInRange(
      [{ id: 'x', kind: 'incident', at: '2026-10-18T17:00:00Z', title: 'Bad row 4111 1111 1111 1111' }],
      '2026-10-18T16:00:00Z',
      '2026-10-18T18:00:00Z',
    );
    expect(a?.title).toBe('Bad row •••• •••• •••• 1111');
  });

  it('nothing in range → empty list', () => {
    expect(annotationsInRange(list, '2026-10-19T00:00:00Z', '2026-10-19T01:00:00Z')).toEqual([]);
  });
});
