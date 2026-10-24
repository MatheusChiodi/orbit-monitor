import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MonitorView } from '@/shared/api/types';
import { ToastViewport, dismissAllToasts } from '@/shared/ui';
import { ConsoleProvider } from '../../ConsoleContext';
import { DEMO_ACCESS, createConsoleSource, type ConsoleApi, type ConsoleSource } from '../../consoleSource';
import { MonitorsScreen } from './MonitorsScreen';

const self = { id: 'orbit_self', name: 'Orbit', groupId: '', type: 'SELF', status: 'OK', value: null, since: '' } as unknown as MonitorView;

function setup({ source = createConsoleSource({} as ConsoleApi, true), editable = true } = {}) {
  const navigate = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ConsoleProvider value={{ source, access: DEMO_ACCESS, editable, demo: true, navigate }}>
        <MonitorsScreen />
        <ToastViewport />
      </ConsoleProvider>
    </QueryClientProvider>,
  );
  return { navigate, source };
}

function freshInstall(): ConsoleSource {
  return createConsoleSource(
    { getAccess: async () => DEMO_ACCESS, listGroups: async () => [], listMonitors: async () => [self] } as unknown as ConsoleApi,
    false,
  );
}

afterEach(() => dismissAllToasts());

describe('Monitors screen', () => {
  it('has a page title, the orbit rail and Add monitor', async () => {
    const { navigate } = setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Monitors' })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Monitors in orbit' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add monitor' }));
    expect(navigate).toHaveBeenCalledWith({ name: 'new-monitor' });
  });

  it('a fresh install shows the onboarding as the empty state, with no "no match" message', async () => {
    const { navigate } = setup({ source: freshInstall() });
    expect(await screen.findByRole('heading', { name: 'Nothing in orbit yet', level: 2 })).toBeInTheDocument();
    expect(screen.queryByText(/No monitors match/)).toBeNull();
    expect(screen.queryByText(/Play intro/)).toBeNull();
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add monitor' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Monitor a URL/ }));
    expect(navigate).toHaveBeenCalledWith({ name: 'new-monitor', kind: 'HTTP' });
  });

  it('the "…" menu offers Reorder and Manage groups', async () => {
    setup();
    await screen.findByText('Reconciliation queue');
    await userEvent.click(screen.getByRole('button', { name: 'More monitor actions' }));
    expect(screen.getByRole('menuitem', { name: 'Reorder' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Manage groups' }));
    expect(screen.getByRole('dialog', { name: 'Manage groups' })).toBeInTheDocument();
  });

  it('selected monitors can be deleted after confirming', async () => {
    const { source } = setup();
    const remove = vi.spyOn(source, 'bulkMonitors');
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Select Reconciliation queue' }));
    const toolbar = screen.getByRole('toolbar', { name: 'Selected monitors' });
    await userEvent.click(within(toolbar).getByRole('button', { name: 'Delete' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete monitor' }));
    expect(remove).toHaveBeenCalledWith(['reconciliation'], 'delete', undefined);
    expect(await screen.findByText('Monitor deleted')).toBeInTheDocument();
  });

  it('New group is a visible button and creates the group', async () => {
    const { source } = setup();
    const save = vi.spyOn(source, 'saveGroup');
    await userEvent.click(await screen.findByRole('button', { name: 'New group' }));
    const dialog = screen.getByRole('dialog', { name: 'New group' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Group name' }), 'Data Warehouse');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add group' }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ id: 'data-warehouse', name: 'Data Warehouse' }));
    expect(await screen.findByText('Group saved')).toBeInTheDocument();
  });

  it('each row has a "…" menu with every monitor action', async () => {
    const { source, navigate } = setup();
    const pause = vi.spyOn(source, 'pauseMonitor');
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Reconciliation queue' }));
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Edit', 'Duplicate', 'Pause', 'Run now', 'Move to group…', 'Delete']);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Pause' }));
    expect(pause).toHaveBeenCalledWith('reconciliation');
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Reconciliation queue' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(navigate).toHaveBeenCalledWith({ name: 'edit-monitor', id: 'reconciliation' });
  });

  it('deleting a group with monitors moves them to the chosen group first', async () => {
    const { source } = setup();
    const remove = vi.spyOn(source, 'deleteGroup');
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for group Payments' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete group…' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete group Payments?' });
    expect(dialog).toHaveTextContent('Its 4 monitors move to another group first');
    const confirm = within(dialog).getByRole('button', { name: 'Delete group' });
    expect(confirm).toBeDisabled();
    await userEvent.selectOptions(within(dialog).getByRole('combobox', { name: 'Move 4 monitors to' }), 'core');
    await userEvent.click(confirm);
    expect(remove).toHaveBeenCalledWith('pay', 'core');
    expect(await screen.findByText('Group deleted')).toBeInTheDocument();
  });

  it('view-only clients see no edit controls', async () => {
    setup({ editable: false });
    await screen.findByText('Reconciliation queue');
    expect(screen.queryByRole('button', { name: 'Add monitor' })).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'More monitor actions' })).toBeNull();
  });
});
