import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '@/domains/wall/mock';
import type { MonitorView } from '@/shared/api/types';
import { renderWithLocale } from '@/test/renderWithLocale';
import { GroupList } from './GroupList';

const snap = mockSnapshot('incident', new Date(2026, 9, 18, 17, 10, 0));

describe('GroupList', () => {
  it('lists groups with a summary and monitors with state, kind, rule in words and value', () => {
    render(<GroupList groups={snap.groups} monitors={snap.monitors} />);
    const payments = screen.getByRole('region', { name: 'Payments' });
    expect(within(payments).getByText('2 of 4 OK')).toBeInTheDocument();
    const rows = within(payments).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Reconciliation queue');
    expect(rows[0]).toHaveTextContent('Down');
    expect(rows[0]).toHaveTextContent('Query');
    expect(rows[0]).toHaveTextContent('QTY below 200');
    expect(within(rows[0]!).getByTitle('QTY < 200')).toBeInTheDocument();
    expect(rows[0]).toHaveTextContent('349 QTY');
  });

  it('every group uses the same columns', () => {
    render(<GroupList groups={snap.groups} monitors={snap.monitors} />);
    const widths = screen.getAllByRole('region').map((region) =>
      Array.from(within(region).getAllByRole('row')[1]!.children).map((cell) => cell.className.match(/\bw-\S+/g)?.join(' ') ?? ''),
    );
    expect(new Set(widths.map((w) => w.join('|'))).size).toBe(1);
  });

  it('FE-59: each monitor row is addressable as #monitor-<id>', () => {
    render(<GroupList groups={snap.groups} monitors={snap.monitors} />);
    expect(document.getElementById('monitor-reconciliation')).toHaveTextContent('Reconciliation queue');
  });

  it('a row opens the monitor on click and has a link with a chevron', async () => {
    const onOpenMonitor = vi.fn();
    render(<GroupList groups={snap.groups} monitors={snap.monitors} onOpenMonitor={onOpenMonitor} />);
    await userEvent.click(screen.getByText('Reconciliation queue'));
    expect(onOpenMonitor).toHaveBeenCalledWith('reconciliation');
    expect(screen.getByRole('link', { name: 'Open Reconciliation queue' })).toHaveAttribute('href', '#/monitors/reconciliation');
  });

  it('rows can be selected for bulk actions, one by one or per group', async () => {
    const onSelectionChange = vi.fn();
    const { rerender } = render(
      <GroupList groups={snap.groups} monitors={snap.monitors} selected={new Set()} onSelectionChange={onSelectionChange} />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Reconciliation queue' }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(['reconciliation']));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all in Payments' }));
    const payments = snap.monitors.filter((m) => m.groupId === snap.groups.find((g) => g.name === 'Payments')!.id).map((m) => m.id);
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set(payments));
    rerender(<GroupList groups={snap.groups} monitors={snap.monitors} canEdit={false} selected={new Set()} onSelectionChange={onSelectionChange} />);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('monitors of a group that no longer exists show under Ungrouped; the self check never shows', () => {
    const orphan = { ...snap.monitors[0]!, id: 'orphan', name: 'Orphan check', groupId: 'gone' };
    const self = { id: 'orbit_self', name: 'Orbit', groupId: '', type: 'SELF', status: 'OK', value: null, since: '' } as unknown as MonitorView;
    render(<GroupList groups={snap.groups} monitors={[...snap.monitors, orphan, self]} />);
    expect(within(screen.getByRole('region', { name: 'Ungrouped' })).getByText('Orphan check')).toBeInTheDocument();
    expect(screen.queryByText('Orbit')).toBeNull();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<GroupList groups={snap.groups} monitors={snap.monitors} />, 'pt-BR');
    expect(screen.getByRole('searchbox', { name: 'Filtrar monitores' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Payments' })).getByText('2 de 4 OK')).toBeInTheDocument();
  });

  it('filters by text and says so when nothing matches', async () => {
    render(<GroupList groups={snap.groups} monitors={snap.monitors} />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Filter monitors' }), 'tablespace');
    expect(screen.getByText('USERS tablespace')).toBeInTheDocument();
    // Filtered-out rows leave through the FE-51 exit animation before unmounting.
    await waitFor(() => {
      expect(screen.queryByText('Reconciliation queue')).toBeNull();
      expect(screen.queryByRole('region', { name: 'Payments' })).toBeNull();
    });
    await userEvent.type(screen.getByRole('searchbox', { name: 'Filter monitors' }), 'zzz');
    expect(screen.getByText('No monitors match “tablespacezzz”')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
    expect(screen.getByRole('searchbox', { name: 'Filter monitors' })).toHaveValue('');
  });

  it('without monitors and without a filter it renders no "no match" message (the screen shows onboarding)', () => {
    render(<GroupList groups={[]} monitors={[]} />);
    expect(screen.queryByText(/No monitors match/)).toBeNull();
  });
});
