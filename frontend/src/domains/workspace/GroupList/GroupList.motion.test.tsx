import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '@/domains/wall/mock';
import { entersAnimated, flushMotion, isStatic, renderWithMotion } from '@/test/motion';
import { GroupList } from './GroupList';

const snap = mockSnapshot('incident', new Date(2026, 9, 18, 17, 10, 0));

function row(name: string) {
  return screen.getByText(name).closest('tr') as HTMLElement;
}

describe('FE-51 GroupList motion', () => {
  it('standard: rows are reorderable and enter animated', () => {
    renderWithMotion(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={vi.fn()} />, 'standard');
    const tr = row('Reconciliation queue');
    expect(tr).toHaveAttribute('data-motion', 'reorder');
    expect(tr).toHaveAttribute('data-motion-level', 'standard');
    expect(entersAnimated(tr)).toBe(true);
  });

  it('off: static', () => {
    renderWithMotion(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={vi.fn()} />, 'off');
    expect(isStatic(row('Reconciliation queue'))).toBe(true);
  });

  it('filtered-out rows leave through AnimatePresence in standard', async () => {
    renderWithMotion(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={vi.fn()} />, 'standard');
    // One change event, so the exit is observed right after it (typing char by char outlasts the exit).
    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter monitors' }), { target: { value: 'tablespace' } });
    expect(screen.queryByText('Reconciliation queue')).not.toBeNull();
    await flushMotion(500);
    expect(screen.queryByText('Reconciliation queue')).toBeNull();
  });

  it('off: filtering is immediate', async () => {
    renderWithMotion(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={vi.fn()} />, 'off');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Filter monitors' }), 'tablespace');
    await flushMotion();
    expect(screen.queryByText('Reconciliation queue')).toBeNull();
  });

  it('state column carries data-status for the color cross-fade', () => {
    renderWithMotion(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={vi.fn()} />, 'standard');
    expect(row('Reconciliation queue')).toHaveAttribute('data-status', 'DOWN');
  });

  it('prefers-reduced-motion forces off', () => {
    renderWithMotion(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={vi.fn()} />, 'expressive', 'en', {
      reducedMotion: true,
    });
    expect(row('Reconciliation queue')).toHaveAttribute('data-motion-level', 'off');
    expect(isStatic(row('Reconciliation queue'))).toBe(true);
  });
});
