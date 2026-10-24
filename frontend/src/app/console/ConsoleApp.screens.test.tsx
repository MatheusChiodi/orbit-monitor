import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dismissAllToasts } from '@/shared/ui';
import { ConsoleApp } from './ConsoleApp';
import type { ConsoleApi } from './consoleSource';

// The Settings area is tested with its own screens; the shell only hands it the section.
vi.mock('./screens/SettingsRoute', () => ({ SettingsRoute: () => null }));

/** No backend: the console runs on demo data kept in memory. */
function offline(): ConsoleApi {
  const fail = vi.fn().mockRejectedValue(new Error('offline'));
  return { getAccess: fail, listGroups: fail, listMonitors: fail, listConnections: fail, previewMonitor: fail, createMonitor: fail };
}

async function open(hash: string) {
  render(<ConsoleApp api={offline()} demo />);
  await screen.findByText('Showing demo data');
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

beforeEach(() => {
  dismissAllToasts();
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

  it('FE-39: #/incidents says when an incident was acknowledged, never by whom', async () => {
    await open('#/incidents');
    const resolved = await screen.findByRole('list', { name: 'Resolved' });
    expect(within(resolved).getByText(/^Acknowledged at \d{2}:\d{2}$/)).toBeInTheDocument();
    expect(screen.queryByText(/self-declared|R\. Lima/)).toBeNull();
  });

  it('FE-36: #/audit filters the trail and opens the SELECT history diff', async () => {
    await open('#/audit');
    const table = await screen.findByRole('table', { name: 'Audit trail' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getByRole('columnheader', { name: 'Client' })).toBeInTheDocument();
    expect(within(table).getAllByText('This machine')).toHaveLength(2);
    expect(within(table).getByText('Local network')).toBeInTheDocument();
    expect(within(table).queryByText(/self-declared/)).toBeNull();
    // Filters are selects that apply as soon as they change (no Apply button).
    expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText('Client'), 'lan');
    await vi.waitFor(() => expect(within(screen.getByRole('table', { name: 'Audit trail' })).getAllByRole('row')).toHaveLength(2));
    await userEvent.selectOptions(screen.getByLabelText('Action'), 'monitor');
    expect(await screen.findByText('No audit entries match.')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Action'), '');
    await userEvent.selectOptions(screen.getByLabelText('Client'), '');
    const [show] = await screen.findAllByRole('button', { name: 'View change: Reconciliation queue' });
    await userEvent.click(show!);
    expect(await screen.findAllByText(/line removed/)).not.toHaveLength(0);
  });

});
