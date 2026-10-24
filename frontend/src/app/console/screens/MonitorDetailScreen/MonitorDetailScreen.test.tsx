import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MonitorDetailRecord } from '@/shared/api/consoleTypes';
import { ToastViewport, dismissAllToasts } from '@/shared/ui';
import { ConsoleProvider } from '../../ConsoleContext';
import { DEMO_ACCESS, createConsoleSource, type ConsoleApi } from '../../consoleSource';
import { MonitorDetailScreen } from './MonitorDetailScreen';

const iso = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();

function detail(overrides: Partial<MonitorDetailRecord> = {}, paused = false): MonitorDetailRecord {
  return {
    definition: { type: 'HTTP', id: 'm', name: 'Web portal', groupId: 'g', url: 'https://portal.example/health', method: 'GET', conditions: [], fields: [], paused },
    status: { id: 'm', name: 'Web portal', groupId: 'g', type: 'HTTP', status: 'OK', value: 120, unit: 'ms', since: iso(5) },
    lastResult: null,
    uptime: null,
    latency: null,
    ...overrides,
  } as MonitorDetailRecord;
}

function setup(record = detail(), editable = true) {
  const api = {
    getAccess: async () => DEMO_ACCESS,
    listGroups: async () => [{ id: 'g', name: 'Web' }],
    listMonitors: async () => [record.status],
    getMonitor: vi.fn().mockResolvedValue(record),
    listIncidents: vi.fn().mockResolvedValue([]),
    getHistory: vi.fn().mockRejectedValue(new Error('unavailable')),
    createMonitor: vi.fn(),
    pauseMonitor: vi.fn().mockResolvedValue(record),
    resumeMonitor: vi.fn().mockResolvedValue(record),
    duplicateMonitor: vi.fn().mockResolvedValue({ definition: { id: 'http_copy_1' } }),
    runMonitor: vi.fn().mockResolvedValue({ state: 'DOWN', latencyMs: 812, error: null, checkedAt: iso(0) }),
    deleteMonitor: vi.fn().mockResolvedValue(undefined),
    listSilences: vi.fn().mockResolvedValue([]),
    createSilence: vi.fn(),
    liftSilence: vi.fn(),
    listEvents: vi.fn().mockResolvedValue([{ at: iso(3), type: 'state.change', monitorId: 'm', actor: null, detail: 'OK → DOWN' }]),
  };
  const source = createConsoleSource(api as unknown as ConsoleApi, false);
  const navigate = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ConsoleProvider value={{ source, access: DEMO_ACCESS, editable, demo: false, navigate }}>
        <MonitorDetailScreen id="m" />
        <ToastViewport />
      </ConsoleProvider>
    </QueryClientProvider>,
  );
  return { api, navigate };
}

afterEach(() => dismissAllToasts());

describe('Monitor detail', () => {
  it('Edit opens the edit screen; Open target is a secondary link', async () => {
    const { navigate } = setup();
    expect(await screen.findByRole('heading', { level: 1, name: 'Web portal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open target' })).toHaveAttribute('href', 'https://portal.example/health');
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(navigate).toHaveBeenCalledWith({ name: 'edit-monitor', id: 'm' });
  });

  it('Pause calls the pause endpoint and never re-sends the definition', async () => {
    const { api } = setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Pause' }));
    expect(api.pauseMonitor).toHaveBeenCalledWith('m');
    expect(api.createMonitor).not.toHaveBeenCalled();
    expect(await screen.findByText('Monitor paused')).toBeInTheDocument();
  });

  it('Run now runs the check and says the result', async () => {
    const { api } = setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Monitor actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Run now' }));
    expect(api.runMonitor).toHaveBeenCalledWith('m');
    expect(await screen.findByText('Check finished: Down')).toBeInTheDocument();
  });

  it('lists the latest events of the monitor in words', async () => {
    setup();
    const events = await screen.findByRole('list', { name: 'Events' });
    expect(events).toHaveTextContent('State changed');
  });

  it('Silence alerts… opens the silence dialog for this monitor', async () => {
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Monitor actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Silence alerts…' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Web portal');
  });

  it('a paused monitor says so and offers Resume', async () => {
    setup(detail({}, true));
    expect(await screen.findByRole('button', { name: 'Resume' })).toBeInTheDocument();
    expect(screen.getByText('Checks are paused; no alerts are sent.')).toBeInTheDocument();
  });

  it('Duplicate asks the server for a copy and opens it in Edit', async () => {
    const { api, navigate } = setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Monitor actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));
    expect(api.duplicateMonitor).toHaveBeenCalledWith('m');
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith({ name: 'edit-monitor', id: 'http_copy_1' }));
  });

  it('Delete asks for confirmation, deletes and returns to the list', async () => {
    const { api, navigate } = setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Monitor actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete Web portal?' });
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete monitor' }));
    expect(api.deleteMonitor).toHaveBeenCalledWith('m');
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith({ name: 'monitors' }));
  });

  it('explains empty stats instead of a bare dash', async () => {
    setup();
    await screen.findByRole('heading', { level: 1, name: 'Web portal' });
    expect(screen.getAllByText('Not enough data yet')).toHaveLength(2);
  });

  it('view-only clients get no edit actions', async () => {
    setup(detail(), false);
    await screen.findByRole('heading', { level: 1, name: 'Web portal' });
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Monitor actions' })).toBeNull();
  });
});
