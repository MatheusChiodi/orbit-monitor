import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOperatorStore } from '@/domains/security/operator';
import type { IncidentRecord } from '@/shared/api/consoleTypes';
import { renderWithLocale } from '@/test/renderWithLocale';
import { ConsoleApp } from './ConsoleApp';
import type { ConsoleApi } from './consoleSource';

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
      acknowledgedBy: 'M. Chiodi',
      acknowledgedAt: iso(0),
      events: [...incident.events, { type: 'ACKNOWLEDGED', actor: 'M. Chiodi', at: iso(0), detail: null }],
    }),
    commentIncident: vi.fn().mockResolvedValue({
      ...incident,
      events: [...incident.events, { type: 'COMMENTED', actor: 'M. Chiodi', at: iso(0), detail: 'on it' }],
    }),
    linkIncidentTicket: vi.fn().mockResolvedValue({ ...incident, ticket: 'OPS-9' }),
    ...overrides,
  };
}

function operator() {
  const store = createOperatorStore();
  store.getState().setName('M. Chiodi');
  return store;
}

async function go(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('console routes', () => {
  it('the header lists every section and marks the current one', async () => {
    render(<ConsoleApp api={api()} operatorStore={operator()} />);
    const nav = await screen.findByRole('navigation', { name: 'Console sections' });
    expect(within(nav).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '#/', '#/incidents', '#/maintenance', '#/dependencies', '#/reports', '#/status-pages', '#/audit', '#/settings',
    ]);
    expect(within(nav).getByRole('link', { name: 'Monitors' })).toHaveAttribute('aria-current', 'page');
    await go('#/incidents');
    expect(within(nav).getByRole('link', { name: 'Incidents' })).toHaveAttribute('aria-current', 'page');
  });

  it('FE-39: the incident list links to #/incidents/:id where operators acknowledge, comment and link a ticket', async () => {
    const a = api();
    render(<ConsoleApp api={a} operatorStore={operator()} />);
    await go('#/incidents');
    const list = await screen.findByRole('list', { name: 'Open' });
    const link = within(list).getByRole('link', { name: 'Web portal' });
    expect(link).toHaveAttribute('href', '#/incidents/inc-1');
    await go('#/incidents/inc-1');
    expect(await screen.findByRole('heading', { level: 1, name: 'Web portal' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Timeline' })).toHaveTextContent('Opened');
    await userEvent.click(screen.getByRole('button', { name: /Acknowledge/ }));
    expect(a.acknowledgeIncidentRecord).toHaveBeenCalledWith('inc-1', 'M. Chiodi');
    await userEvent.type(screen.getByLabelText('Comment'), 'on it');
    await userEvent.click(screen.getByRole('button', { name: 'Add comment' }));
    expect(a.commentIncident).toHaveBeenCalledWith('inc-1', 'M. Chiodi', 'on it');
    expect(await screen.findByText('on it')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Ticket'), 'OPS-9');
    await userEvent.click(screen.getByRole('button', { name: 'Link ticket' }));
    expect(a.linkIncidentTicket).toHaveBeenCalledWith('inc-1', 'M. Chiodi', 'OPS-9');
  });

  it('BE-26: editors resolve from the incident page; the next escalation step is shown; a 409 is reported', async () => {
    const resolveIncident = vi.fn().mockRejectedValue(new Error('Incident inc-1 is already resolved'));
    const getIncidentEscalation = vi.fn().mockResolvedValue({ incidentId: 'inc-1', stepName: 'Page the DBA', dueAt: iso(-5) });
    render(<ConsoleApp api={api({ resolveIncident, getIncidentEscalation })} operatorStore={operator()} />);
    await screen.findByText('Web portal');
    await go('#/incidents/inc-1');
    expect(await screen.findByText(/Page the DBA/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Resolve' }));
    expect(resolveIncident).toHaveBeenCalledWith('inc-1', 'M. Chiodi');
    expect(await screen.findByText('Incident inc-1 is already resolved')).toBeInTheDocument();
  });

  it('view-only clients see the incident with Acknowledge only', async () => {
    render(<ConsoleApp api={api({ getAccess: vi.fn().mockResolvedValue({ mode: 'view-only', client: 'lan' }) })} operatorStore={operator()} />);
    await screen.findByText('Web portal');
    await go('#/incidents/inc-1');
    expect(await screen.findByRole('button', { name: /Acknowledge/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolve' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add comment' })).toBeNull();
  });

  it('FE-38: the bell in the header shows the incident feed and links to the incident', async () => {
    render(<ConsoleApp api={api()} operatorStore={operator()} />);
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
    render(<ConsoleApp api={api({ listIncidents })} operatorStore={operator()} connectFeed={connectFeed} />);
    await screen.findByRole('button', { name: 'Notifications (1 unread)' });
    expect(screen.queryByRole('status')).toBeNull();
    listIncidents.mockResolvedValue([incident, { ...incident, id: 'inc-2', events: [{ ...incident.events[0]!, at: iso(0) }] }]);
    await act(async () => push());
    expect(await screen.findByRole('button', { name: 'Notifications (2 unread)' })).toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(within(region).getByRole('status')).toHaveTextContent('Web portal opened an incident');
  });

  it('#/monitors/new/push preselects the kind and shows the one-time push URL after saving', async () => {
    const createMonitor = vi.fn().mockResolvedValue({ definition: {}, pushUrl: 'http://127.0.0.1:8080/api/push/s3cr3t' });
    render(<ConsoleApp api={api({ createMonitor })} operatorStore={operator()} />);
    await screen.findByText('Web portal');
    await go('#/monitors/new/push');
    expect(await screen.findByRole('radio', { name: 'Push' })).toBeChecked();
    await userEvent.type(screen.getByLabelText('Name'), 'Nightly export');
    await userEvent.selectOptions(screen.getByLabelText('Group'), 'g');
    await userEvent.click(screen.getByRole('button', { name: 'Save monitor' }));
    expect(createMonitor.mock.calls[0]?.[0]).toMatchObject({ type: 'PUSH', maxSilenceSeconds: 3600 });
    const url = await screen.findByLabelText('Push URL (shown once, keep it secret)');
    expect(url).toHaveValue('http://127.0.0.1:8080/api/push/s3cr3t');
    expect(localStorage.getItem('orbit.preferences') ?? '').not.toContain('s3cr3t');
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(await screen.findByText('Monitor "Nightly export" saved')).toBeInTheDocument();
    expect(screen.queryByDisplayValue(/s3cr3t/)).toBeNull();
  });

  it('an unknown hash shows "Page not found" with a way back', async () => {
    render(<ConsoleApp api={api()} operatorStore={operator()} />);
    await screen.findByText('Web portal');
    await go('#/nowhere');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('a screen whose endpoint the backend lacks says so instead of failing', async () => {
    render(<ConsoleApp api={api()} operatorStore={operator()} />);
    await screen.findByText('Web portal');
    await go('#/maintenance');
    expect(await screen.findByRole('alert')).toHaveTextContent('This screen needs an Orbit API that does not answer yet.');
  });

  it('renders the navigation in pt-BR', async () => {
    renderWithLocale(<ConsoleApp api={api()} operatorStore={operator()} />, 'pt-BR');
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
    render(<ConsoleApp api={api({ saveGroupOrder, listGroups, listMonitors })} operatorStore={operator()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Reorder' }));
    await userEvent.click(screen.getByRole('button', { name: 'Move Billing up' }));
    expect(saveGroupOrder).toHaveBeenCalledWith({ groupIds: ['h', 'g'], monitors: { h: [], g: ['m', 'n'] } });
    const first = within(screen.getByRole('listbox', { name: 'Portal' })).getAllByRole('option')[0]!;
    first.focus();
    await userEvent.keyboard(' {ArrowDown} ');
    expect(saveGroupOrder).toHaveBeenLastCalledWith({ groupIds: ['h', 'g'], monitors: expect.objectContaining({ g: ['n', 'm'] }) });
    expect(await screen.findByText('Order saved')).toBeInTheDocument();
  });

  it('view-only clients cannot reorder', async () => {
    render(<ConsoleApp api={api({ getAccess: vi.fn().mockResolvedValue({ mode: 'view-only', client: 'lan' }) })} operatorStore={operator()} />);
    await screen.findByText('Web portal');
    expect(screen.queryByRole('button', { name: 'Reorder' })).toBeNull();
  });
});
