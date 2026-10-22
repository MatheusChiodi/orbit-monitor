import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '@/domains/wall/mock';
import { renderWithLocale } from '@/test/renderWithLocale';
import { GroupList } from './GroupList';

const snap = mockSnapshot('incident', new Date(2026, 9, 18, 17, 10, 0));

describe('GroupList', () => {
  it('lists groups with a summary and monitors with state text, rule and type', () => {
    render(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={vi.fn()} />);
    const payments = screen.getByRole('region', { name: 'Payments' });
    expect(within(payments).getByText('2/4 ok · DOWN')).toBeInTheDocument();
    const rows = within(payments).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Reconciliation queue');
    expect(rows[0]).toHaveTextContent('DOWN');
    expect(rows[0]).toHaveTextContent('SQL');
    expect(rows[0]).toHaveTextContent('QTY < 200');
    expect(rows[0]).toHaveTextContent('349 QTY');
  });

  it('FE-59: each monitor row is addressable as #monitor-<id> (living orb "open", wall card actions)', () => {
    render(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={vi.fn()} />);
    expect(document.getElementById('monitor-reconciliation')).toHaveTextContent('Reconciliation queue');
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('searchbox', { name: 'Filtrar monitores' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo monitor' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Payments' })).getByText('2/4 ok · FORA')).toBeInTheDocument();
  });

  it('filters by text', async () => {
    render(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={vi.fn()} />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Filter monitors' }), 'tablespace');
    expect(screen.getByText('USERS tablespace')).toBeInTheDocument();
    // Filtered-out rows leave through the FE-51 exit animation before unmounting.
    await waitFor(() => {
      expect(screen.queryByText('Reconciliation queue')).toBeNull();
      expect(screen.queryByRole('region', { name: 'Payments' })).toBeNull();
    });
  });

  it('the New monitor button only for those who can edit', async () => {
    const onNewMonitor = vi.fn();
    const { rerender } = render(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={onNewMonitor} />);
    await userEvent.click(screen.getByRole('button', { name: 'New monitor' }));
    expect(onNewMonitor).toHaveBeenCalled();
    rerender(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={onNewMonitor} canEdit={false} />);
    expect(screen.queryByRole('button', { name: 'New monitor' })).toBeNull();
  });

  it('empty', () => {
    render(<GroupList groups={[]} monitors={[]} onNewMonitor={vi.fn()} />);
    expect(screen.getByText('No monitors found')).toBeInTheDocument();
  });
});
