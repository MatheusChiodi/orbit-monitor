import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WallSnapshot } from '@/shared/api/types';
import { entersAnimated, flushMotion, isStatic, renderWithMotion } from '@/test/motion';
import { mockSnapshot } from '../../mock';
import { groupRows } from '../../selectors';
import { MonitorMatrix } from './MonitorMatrix';

const now = new Date(2026, 9, 18, 17, 10, 0);

function matrix(snap: WallSnapshot) {
  return <MonitorMatrix rows={groupRows(snap)} unownedMonitorIds={new Set()} />;
}

function cell(name: string) {
  return screen.getByText(name).closest('li') as HTMLElement;
}

afterEach(() => vi.useRealTimers());

describe('FE-51 MonitorMatrix motion', () => {
  it('cells are reorderable layout items that enter animated in standard', () => {
    renderWithMotion(matrix(mockSnapshot('incident', now)), 'standard');
    const c = cell('Reconciliation queue');
    expect(c).toHaveAttribute('data-motion', 'reorder');
    expect(c).toHaveAttribute('data-motion-level', 'standard');
    expect(entersAnimated(c)).toBe(true);
  });

  it('off: cells are static', () => {
    renderWithMotion(matrix(mockSnapshot('incident', now)), 'off');
    expect(isStatic(cell('Reconciliation queue'))).toBe(true);
  });

  it('status change: the cell carries the new data-status for the color cross-fade', () => {
    const ok = mockSnapshot('ok', now);
    const { rerender } = renderWithMotion(matrix(ok), 'standard');
    expect(cell('Reconciliation queue')).toHaveAttribute('data-status', 'OK');
    rerender(matrix(mockSnapshot('incident', now)));
    expect(cell('Reconciliation queue')).toHaveAttribute('data-status', 'DOWN');
  });

  it('value change flashes in the direction color; never in off', () => {
    vi.useFakeTimers();
    const snap = mockSnapshot('incident', now);
    const bump = (value: number): WallSnapshot => ({
      ...snap,
      monitors: snap.monitors.map((m) => (m.id === 'reconciliation' ? { ...m, value } : m)),
    });
    const { rerender, unmount } = renderWithMotion(matrix(bump(349)), 'standard');
    rerender(matrix(bump(400)));
    expect(within(cell('Reconciliation queue')).getByText('400 QTY')).toHaveAttribute('data-flash', 'up');
    unmount();
    const off = renderWithMotion(matrix(bump(349)), 'off');
    off.rerender(matrix(bump(400)));
    expect(within(cell('Reconciliation queue')).getByText('400 QTY')).not.toHaveAttribute('data-flash');
  });

  it('a removed monitor leaves through AnimatePresence in standard, immediately in off', async () => {
    const snap = mockSnapshot('incident', now);
    const without = { ...snap, monitors: snap.monitors.filter((m) => m.id !== 'dns') };
    const std = renderWithMotion(matrix(snap), 'standard');
    std.rerender(matrix(without));
    expect(screen.queryByText('Internal DNS')).not.toBeNull();
    await flushMotion(500);
    expect(screen.queryByText('Internal DNS')).toBeNull();
    std.unmount();
    const off = renderWithMotion(matrix(snap), 'off');
    off.rerender(matrix(without));
    await flushMotion();
    expect(screen.queryByText('Internal DNS')).toBeNull();
  });

  it('prefers-reduced-motion forces off', () => {
    renderWithMotion(matrix(mockSnapshot('incident', now)), 'expressive', 'en', { reducedMotion: true });
    expect(cell('Reconciliation queue')).toHaveAttribute('data-motion-level', 'off');
    expect(isStatic(cell('Reconciliation queue'))).toBe(true);
  });
});
