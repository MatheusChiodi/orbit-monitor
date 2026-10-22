import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOperatorStore } from '@/domains/security/operator';
import { ConsoleApp } from './ConsoleApp';
import type { ConsoleApi } from './consoleSource';

/** No backend: the console runs on demo data kept in memory. */
function offline(): ConsoleApi {
  const fail = vi.fn().mockRejectedValue(new Error('offline'));
  return { getAccess: fail, listGroups: fail, listMonitors: fail, listConnections: fail, previewMonitor: fail, createMonitor: fail };
}

function operator() {
  const store = createOperatorStore();
  store.getState().setName('M. Chiodi');
  return store;
}

async function open(hash: string) {
  render(<ConsoleApp api={offline()} operatorStore={operator()} demo />);
  await screen.findByText('demo data');
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

describe('console screens wired to the data source (demo mode)', () => {
  it('FE-41: #/maintenance creates a window from the calendar', async () => {
    await open('#/maintenance');
    const grid = await screen.findByRole('grid', { name: 'Maintenance calendar' });
    const cells = within(grid).getAllByRole('gridcell');
    fireEvent.pointerDown(cells[18 * 7]!);
    fireEvent.pointerUp(cells[19 * 7]!);
    await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), 'Deploy');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Group' }), 'pay');
    await userEvent.click(screen.getByRole('button', { name: 'Create window' }));
    expect(await screen.findByText('Maintenance window "Deploy" created')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /^Deploy · Payments/ })).toBeInTheDocument();
  });

  it('FE-42: #/dependencies shows the graph and adds a dependency', async () => {
    await open('#/dependencies');
    const graph = await screen.findByRole('group', { name: 'Dependency graph' });
    await userEvent.click(within(graph).getByRole('button', { name: /^Payments/ }));
    expect(screen.getByRole('status')).toHaveTextContent(/Payments impacts/);
    await userEvent.selectOptions(screen.getByLabelText('Depends on (upstream)'), 'portal');
    await userEvent.selectOptions(screen.getByLabelText('Dependent (downstream)'), 'checkout');
    await userEvent.click(screen.getByRole('button', { name: 'Add dependency' }));
    expect(await screen.findByRole('button', { name: 'Remove Customer Portal → Checkout API' })).toBeInTheDocument();
  });

  it('FE-42: a dependency that closes a cycle is refused', async () => {
    await open('#/dependencies');
    await screen.findByRole('group', { name: 'Dependency graph' });
    await userEvent.selectOptions(screen.getByLabelText('Depends on (upstream)'), 'core');
    await userEvent.selectOptions(screen.getByLabelText('Dependent (downstream)'), 'pay');
    await userEvent.click(screen.getByRole('button', { name: 'Add dependency' }));
    expect(screen.getByRole('alert')).toHaveTextContent('This dependency would create a cycle');
  });

  it('FE-43: #/reports lists uptime and exports CSV and PDF', async () => {
    await open('#/reports');
    const table = await screen.findByRole('table', { name: 'Uptime by monitor' });
    expect(within(table).getByText('Reconciliation queue')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    await userEvent.click(screen.getByRole('button', { name: 'Export PDF' }));
    const blobs = vi.mocked(URL.createObjectURL).mock.calls.map(([b]) => (b as Blob).type);
    expect(blobs).toEqual(['text/csv', 'application/pdf']);
  });

  it('FE-44: #/status-pages saves a page', async () => {
    await open('#/status-pages');
    await userEvent.type(await screen.findByRole('textbox', { name: 'Title' }), 'Payments status');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Payments' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save status page' }));
    expect(await screen.findByText('Status page "Payments status" saved')).toBeInTheDocument();
  });

  it('FE-36: #/audit filters the trail and opens the SELECT history diff', async () => {
    await open('#/audit');
    const table = await screen.findByRole('table', { name: 'Audit trail' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    await userEvent.type(screen.getByLabelText('Operator'), 'nobody');
    await userEvent.type(screen.getByLabelText('Action'), 'monitor.delete');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText('No audit entries match.')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Action'));
    await userEvent.clear(screen.getByLabelText('Operator'));
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    const [show] = await screen.findAllByRole('button', { name: 'Show SELECT history for reconciliation' });
    await userEvent.click(show!);
    expect(await screen.findAllByText(/line removed/)).not.toHaveLength(0);
  });

  it('CORE-19: #/settings shows the workspace defaults and export', async () => {
    await open('#/settings');
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByLabelText('Default language')).toHaveValue('en');
  });
});
