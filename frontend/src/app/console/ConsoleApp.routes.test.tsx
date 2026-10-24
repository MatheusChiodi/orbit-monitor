import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncidentRecord } from '@/shared/api/consoleTypes';
import { renderWithLocale } from '@/test/renderWithLocale';
import { dismissAllToasts } from '@/shared/ui';
import { ConsoleApp } from './ConsoleApp';
import type { ConsoleApi } from './consoleSource';

// The Settings area is tested with its own screens; the shell only hands it the section.
vi.mock('./screens/SettingsRoute', () => ({ SettingsRoute: () => null }));

const now = Date.now();
const iso = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();
const incident: IncidentRecord = {
  id: 'inc-1',
  monitorId: 'm',
  status: 'OPEN',
  severity: 'DOWN',
  openedAt: iso(5),
  resolvedAt: null,
  acknowledgedBy: null,
  acknowledgedAt: null,
  ticket: null,
  events: [{ type: 'OPENED', actor: 'orbit', at: iso(5), detail: 'DOWN' }],
};

function api(overrides: Partial<ConsoleApi> = {}): ConsoleApi {
  return {
    getAccess: vi.fn().mockResolvedValue({ mode: 'edit', client: 'loopback' }),
    listGroups: vi.fn().mockResolvedValue([{ id: 'g', name: 'Portal' }]),
    listMonitors: vi.fn().mockResolvedValue([
      { id: 'm', name: 'Web portal', groupId: 'g', type: 'HTTP', status: 'DOWN', value: null, since: iso(5) },
    ]),
    listConnections: vi.fn().mockResolvedValue([]),
    previewMonitor: vi.fn(),
    createMonitor: vi.fn(),
    listIncidents: vi.fn().mockResolvedValue([incident]),
    getIncident: vi.fn().mockResolvedValue(incident),
    acknowledgeIncidentRecord: vi.fn().mockResolvedValue({
      ...incident,
      acknowledgedBy: 'loopback',
      acknowledgedAt: iso(0),
      events: [...incident.events, { type: 'ACKNOWLEDGED', actor: 'loopback', at: iso(0), detail: null }],
    }),
    commentIncident: vi.fn().mockResolvedValue({
      ...incident,
      events: [...incident.events, { type: 'COMMENTED', actor: 'lan', at: iso(0), detail: 'on it' }],
    }),
    linkIncidentTicket: vi.fn().mockResolvedValue({ ...incident, ticket: 'OPS-9' }),
    ...overrides,
  };
}

async function go(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

beforeEach(() => {
  dismissAllToasts();
  localStorage.clear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('console routes', () => {
  it('the sidebar lists every section and marks the current one', async () => {
    render(<ConsoleApp api={api()} />);
    const nav = await screen.findByRole('navigation', { name: 'Console sections' });
    expect(within(nav).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '#/', '#/incidents', '#/maintenance', '#/reports', '#/status-pages', '#/dependencies', '#/audit', '#/settings', '/wall.html',
    ]);
    expect(within(nav).getByRole('link', { name: 'Monitors' })).toHaveAttribute('aria-current', 'page');
    await go('#/incidents');
    expect(within(nav).getByRole('link', { name: /^Incidents/ })).toHaveAttribute('aria-current', 'page');
  });

  it('FE-39: the incident list links to #/incidents/:id where operators acknowledge, comment and link a ticket', async () => {
    const a = api();
    render(<ConsoleApp api={a} />);
    await go('#/incidents');
    const list = await screen.findByRole('list', { name: 'Incidents' });
    const link = within(list).getByRole('link', { name: 'Web portal' });
    expect(link).toHaveAttribute('href', '#/incidents/inc-1');
    await go('#/incidents/inc-1');
    expect(await screen.findByRole('heading', { level: 1, name: 'Web portal' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Timeline' })).toHaveTextContent('Opened');
    await userEvent.click(screen.getByRole('button', { name: /Acknowledge/ }));
    expect(a.acknowledgeIncidentRecord).toHaveBeenCalledWith('inc-1');
    expect(await screen.findByText(/^Acknowledged at \d{2}:\d{2}$/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Timeline' })).toHaveTextContent('Acknowledged · This machine');
    await userEvent.type(screen.getByLabelText('Comment'), 'on it');
    await userEvent.click(screen.getByRole('button', { name: 'Add comment' }));
    expect(a.commentIncident).toHaveBeenCalledWith('inc-1', 'on it');
    expect(await screen.findByText('on it')).toBeInTheDocument();
    expect(screen.getByText('Local network')).toBeInTheDocument();
    expect(screen.queryByText(/self-declared/)).toBeNull();
    await userEvent.type(screen.getByRole('textbox', { name: /^Ticket/ }), 'OPS-9');
    await userEvent.click(screen.getByRole('button', { name: 'Link ticket' }));
    expect(a.linkIncidentTicket).toHaveBeenCalledWith('inc-1', 'OPS-9');
  });

  it('BE-26: editors resolve from the incident page; the next escalation step is shown; a 409 is reported', async () => {
    const resolveIncident = vi.fn().mockRejectedValue(new Error('Incident inc-1 is already resolved'));
    const getIncidentEscalation = vi.fn().mockResolvedValue({ incidentId: 'inc-1', stepName: 'Page the DBA', dueAt: iso(-5) });
    render(<ConsoleApp api={api({ resolveIncident, getIncidentEscalation })} />);
    await screen.findByText('Web portal');
    await go('#/incidents/inc-1');
    expect(await screen.findByText(/Page the DBA/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Resolve' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Resolve incident' }));
    expect(resolveIncident).toHaveBeenCalledWith('inc-1');
    expect(await screen.findByText('Incident inc-1 is already resolved')).toBeInTheDocument();
  });

  it('view-only clients see the incident with Acknowledge only', async () => {
    render(<ConsoleApp api={api({ getAccess: vi.fn().mockResolvedValue({ mode: 'view-only', client: 'lan' }) })} />);
    await screen.findByText('Web portal');
    await go('#/incidents/inc-1');
    expect(await screen.findByRole('button', { name: /Acknowledge/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolve' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add comment' })).toBeNull();
  });

  it('FE-38: the bell in the header shows the incident feed and links to the incident', async () => {
    render(<ConsoleApp api={api()} />);
    const bell = await screen.findByRole('button', { name: 'Notifications (1 unread)' });
    await userEvent.click(bell);
    const link = screen.getByRole('link', { name: 'Web portal opened an incident' });
    expect(link).toHaveAttribute('href', '#/incidents/inc-1');
  });

  it('FE-38: incidents that arrive later through the live feed become toasts', async () => {
    let push: () => void = () => {};
    const listIncidents = vi.fn().mockResolvedValue([incident]);
    const connectFeed = vi.fn((onChange: () => void) => {
      push = onChange;
      return () => {};
    });
    render(<ConsoleApp api={api({ listIncidents })} connectFeed={connectFeed} />);
    await screen.findByRole('button', { name: 'Notifications (1 unread)' });
    expect(screen.queryByRole('alert')).toBeNull();
    listIncidents.mockResolvedValue([incident, { ...incident, id: 'inc-2', events: [{ ...incident.events[0]!, at: iso(0) }] }]);
    await act(async () => push());
    expect(await screen.findByRole('button', { name: 'Notifications (2 unread)' })).toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(within(region).getByRole('alert')).toHaveTextContent('Web portal opened an incident');
  });

  it('#/monitors/new/push preselects the kind and shows the one-time push URL after saving', async () => {
    const createMonitor = vi.fn().mockResolvedValue({ definition: {}, pushUrl: 'http://127.0.0.1:8080/api/push/s3cr3t' });
    render(<ConsoleApp api={api({ createMonitor })} />);
    await screen.findByText('Web portal');
    await go('#/monitors/new/push');
    expect(await screen.findByText(/Type: Push/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Name'), 'Nightly export');
    // The only group is preselected.
    expect(screen.getByLabelText('Group')).toHaveValue('g');
    await userEvent.click(within(screen.getByRole('main')).getByRole('button', { name: 'Add monitor' }));
    expect(createMonitor.mock.calls[0]?.[0]).toMatchObject({ type: 'PUSH', maxSilenceSeconds: 3600 });
    const url = await screen.findByLabelText('Push URL (shown once, keep it secret)');
    expect(url).toHaveValue('http://127.0.0.1:8080/api/push/s3cr3t');
    expect(localStorage.getItem('orbit.preferences') ?? '').not.toContain('s3cr3t');
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(await screen.findByText('Monitor added')).toBeInTheDocument();
    expect(screen.queryByDisplayValue(/s3cr3t/)).toBeNull();
  });

  it('an unknown hash shows "Page not found" with a way back', async () => {
    render(<ConsoleApp api={api()} />);
    await screen.findByText('Web portal');
    await go('#/nowhere');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('a screen whose endpoint the backend lacks says so instead of failing', async () => {
    render(<ConsoleApp api={api()} />);
    await screen.findByText('Web portal');
    await go('#/maintenance');
    expect(await screen.findByRole('alert')).toHaveTextContent('This screen needs an Orbit API that does not answer yet.');
  });

  it('renders the navigation in pt-BR', async () => {
    renderWithLocale(<ConsoleApp api={api()} />, 'pt-BR');
    const nav = await screen.findByRole('navigation', { name: 'Seções do console' });
    expect(within(nav).getByRole('link', { name: 'Páginas de status' })).toBeInTheDocument();
  });
});

describe('FE-13 reorder in the console', () => {
  it('editors reorder groups and monitors; each drop is saved with PUT /api/groups/order', async () => {
    const saveGroupOrder = vi.fn().mockResolvedValue([]);
    const listGroups = vi.fn().mockResolvedValue([{ id: 'g', name: 'Portal' }, { id: 'h', name: 'Billing' }]);
    const listMonitors = vi.fn().mockResolvedValue([
      { id: 'm', name: 'Web portal', groupId: 'g', type: 'HTTP', status: 'OK', value: null, since: iso(5) },
      { id: 'n', name: 'Login', groupId: 'g', type: 'HTTP', status: 'OK', value: null, since: iso(5) },
    ]);
    render(<ConsoleApp api={api({ saveGroupOrder, listGroups, listMonitors })} />);
    await userEvent.click(await screen.findByRole('button', { name: 'More monitor actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Reorder' }));
    await userEvent.click(screen.getByRole('button', { name: 'Move Billing up' }));
    expect(saveGroupOrder).toHaveBeenCalledWith({ groupIds: ['h', 'g'], monitors: { h: [], g: ['m', 'n'] } });
    const first = within(screen.getByRole('listbox', { name: 'Portal' })).getAllByRole('option')[0]!;
    first.focus();
    await userEvent.keyboard(' {ArrowDown} ');
    expect(saveGroupOrder).toHaveBeenLastCalledWith({ groupIds: ['h', 'g'], monitors: expect.objectContaining({ g: ['n', 'm'] }) });
    expect((await screen.findAllByText('Order saved')).length).toBeGreaterThan(0);
  });

  it('view-only clients cannot reorder', async () => {
    render(<ConsoleApp api={api({ getAccess: vi.fn().mockResolvedValue({ mode: 'view-only', client: 'lan' }) })} />);
    await screen.findByText('Web portal');
    expect(screen.queryByRole('button', { name: 'More monitor actions' })).toBeNull();
  });
});

describe('FE-55 card actions in the console', () => {
  it('#/monitors/:id shows the monitor with its incidents and acknowledges the open one', async () => {
    const getMonitor = vi.fn().mockResolvedValue({
      definition: { id: 'm', name: 'Web portal', type: 'HTTP', url: 'https://portal.example/health' },
      status: { id: 'm', name: 'Web portal', groupId: 'g', type: 'HTTP', status: 'DOWN', value: 812, unit: 'ms', since: iso(5) },
      lastResult: { state: 'DOWN', latencyMs: 812, conditions: [{ expression: '[STATUS] == 200', level: 'DOWN', passed: false, actual: 503, message: null }], error: null, checkedAt: iso(1) },
      uptime: { ratio: 0.9912, samples: 1440, coverageFrom: iso(1440) },
      latency: { p50: 120, p95: 640, p99: 900, samples: 1440 },
      historySince: iso(1440),
    });
    const a = api({ getMonitor });
    render(<ConsoleApp api={a} />);
    await screen.findByText('Web portal');
    await go('#/monitors/m');
    expect(await screen.findByRole('heading', { level: 1, name: 'Web portal' })).toBeInTheDocument();
    expect(screen.getByText('640 ms')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open target' })).toHaveAttribute('href', 'https://portal.example/health');
    expect(screen.getByRole('link', { name: 'Open target' })).toHaveAttribute('rel', 'noopener noreferrer');
    await userEvent.click(await screen.findByRole('button', { name: 'Acknowledge open incident' }));
    expect(a.acknowledgeIncidentRecord).toHaveBeenCalledWith('inc-1');
    expect(await screen.findByText('Incident acknowledged')).toBeInTheDocument();
  });
});

describe('FE-58 history range on the SLA screen', () => {
  it('one period control (24 h / 7 d / 30 d / custom) drives the summaries and states the coverage', async () => {
    const getHistoryCoverage = vi.fn().mockResolvedValue({ oldest: iso(3 * 24 * 60), newest: iso(0), retentionDays: 30, rawWritesEnabled: true });
    const getHistorySummary = vi.fn().mockResolvedValue({ from: iso(60), to: iso(0), samples: 100, down: 1, uptimePercent: 99, p50: 1, p95: 2, p99: 3 });
    render(<ConsoleApp api={api({ getHistoryCoverage, getHistorySummary })} />);
    await screen.findByText('Web portal');
    await go('#/reports');
    const picker = await screen.findByRole('radiogroup', { name: 'History period' });
    expect(within(picker).getByRole('radio', { name: '24 h' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByRole('radiogroup', { name: 'Period' })).toBeNull();
    expect(screen.getByText(/History available: last 30 days/)).toBeInTheDocument();
    await userEvent.click(within(picker).getByRole('radio', { name: '7 d' }));
    await vi.waitFor(() => {
      const [, range] = getHistorySummary.mock.calls.at(-1)!;
      expect(Date.parse(range.to) - Date.parse(range.from)).toBe(7 * 86_400_000);
    });
    expect(await screen.findByText(/Covers \d+% of this period/)).toBeInTheDocument();
  });
});

describe('FE-58 history window on the incident page and the monitor detail', () => {
  const history = (from: string, to: string) => ({
    monitorId: 'm', from, to, resolution: '1m' as const,
    coverage: { oldest: iso(600), newest: iso(0), retentionDays: 30, rawWritesEnabled: true },
    samples: null,
    buckets: [
      { start: from, count: 3, ok: 2, warn: 0, down: 1, unknown: 0, latencyMin: 1, latencyMax: 3, latencyMean: 2, latencyP95: 3, valueMin: 1, valueMax: 3, valueMean: 2 },
      { start: to, count: 1, ok: 1, warn: 0, down: 0, unknown: 0, latencyMin: 1, latencyMax: 1, latencyMean: 1, latencyP95: 1, valueMin: 4, valueMax: 4, valueMean: 4 },
    ],
  });

  it('the incident page opens a window around the incident with picker, coverage and chart', async () => {
    const getHistory = vi.fn((_: string, range: { from: string; to: string }) => Promise.resolve(history(range.from, range.to)));
    render(<ConsoleApp api={api({ getHistory })} />);
    await screen.findByText('Web portal');
    await go('#/incidents/inc-1');
    const panel = await screen.findByRole('region', { name: 'History window' });
    expect(within(panel).getByRole('radiogroup', { name: 'History period' })).toBeInTheDocument();
    await vi.waitFor(() => expect(within(panel).getByText('25% of the checks were DOWN')).toBeInTheDocument());
    const [, range] = getHistory.mock.calls[0]!;
    expect(Date.parse(range.from)).toBeLessThan(Date.parse(incident.openedAt));
    expect(within(panel).getByRole('img', { name: /Web portal over the selected period/ })).toBeInTheDocument();
  });

  it('the monitor detail shows the same history window (24 h by default)', async () => {
    const getHistory = vi.fn((_: string, range: { from: string; to: string }) => Promise.resolve(history(range.from, range.to)));
    render(<ConsoleApp api={api({ getHistory })} />);
    await screen.findByText('Web portal');
    await go('#/monitors/m');
    const panel = await screen.findByRole('region', { name: 'History window' });
    expect(within(panel).getByRole('radio', { name: '24 h' })).toHaveAttribute('aria-checked', 'true');
    await vi.waitFor(() => expect(getHistory).toHaveBeenCalled());
    const [, range] = getHistory.mock.calls[0]!;
    expect(Date.parse(range.to) - Date.parse(range.from)).toBe(86_400_000);
  });
});
