import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '@/domains/wall/mock';
import { CustomizationProvider } from '@/shared/customization/CustomizationProvider';
import { createCustomizationStore, type CustomizationState } from '@/shared/customization/store';
import { GroupList } from './GroupList';

const snap = mockSnapshot('incident', new Date(2026, 9, 18, 17, 10, 0));

function setup(state: Partial<CustomizationState>) {
  const store = createCustomizationStore({ storage: false });
  store.setState(state);
  const wrapper = ({ children }: { children: ReactNode }) => <CustomizationProvider store={store}>{children}</CustomizationProvider>;
  return wrapper;
}

beforeEach(() => localStorage.clear());

describe('FE-55 GroupList reads card settings from the registry', () => {
  it('uses the instance title and hides fields left out of the card', () => {
    const wrapper = setup({
      workspace: { 'card.monitor.fields': ['status', 'name', 'value'] },
      instances: { 'card.monitor:reconciliation': { 'card.monitor.title': 'Recon backlog' } },
    });
    render(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={vi.fn()} />, { wrapper });
    const rows = within(screen.getByRole('region', { name: 'Payments' })).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Recon backlog');
    expect(rows[0]).toHaveTextContent('Down');
    expect(rows[0]).not.toHaveTextContent('QTY below 200');
    expect(rows[0]).not.toHaveTextContent('Query');
  });

  it('applies the group order, summary and custom title', () => {
    const wrapper = setup({
      workspace: { 'card.group.order': 'name', 'card.group.summary': false },
      instances: { 'card.group:pay': { 'card.group.title': 'Money' } },
    });
    render(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={vi.fn()} />, { wrapper });
    const region = screen.getByRole('region', { name: 'Money' });
    expect(within(region).queryByText('2 of 4 OK')).not.toBeInTheDocument();
    const names = within(region).getAllByRole('row').slice(1).map((r) => r.textContent ?? '');
    expect(names[0]).toContain('Acquirer error rate');
  });

  it('shows the custom empty-state text', async () => {
    const wrapper = setup({ workspace: { 'card.group.emptyText': 'All quiet here' } });
    render(<GroupList groups={snap.groups} monitors={[]} onNewMonitor={vi.fn()} />, { wrapper });
    expect(screen.getByText('All quiet here')).toBeInTheDocument();
  });

  it('runs the configured click action and expands a card in place', async () => {
    const user = userEvent.setup();
    const onOpenMonitor = vi.fn();
    const wrapper = setup({ workspace: { 'card.monitor.doubleClickAction': 'expand' } });
    render(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={vi.fn()} onOpenMonitor={onOpenMonitor} />, { wrapper });
    const row = within(screen.getByRole('region', { name: 'Payments' })).getAllByRole('button', { name: /Reconciliation queue/ })[0]!;
    await user.click(row);
    expect(onOpenMonitor).toHaveBeenCalledWith('reconciliation');
    await user.dblClick(row);
    expect(screen.getByRole('region', { name: /Reconciliation queue details/ })).toBeInTheDocument();
  });

  it('keeps the original look without a provider', () => {
    render(<GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={vi.fn()} />);
    const rows = within(screen.getByRole('region', { name: 'Payments' })).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Query');
    expect(screen.queryAllByRole('button', { name: /Reconciliation queue/ })).toHaveLength(0);
  });
});
