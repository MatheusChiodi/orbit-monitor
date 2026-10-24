import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncidentRecord } from '@/shared/api/consoleTypes';
import { dismissAllToasts } from '@/shared/ui';
import { ConsoleApp } from './ConsoleApp';
import type { ConsoleApi } from './consoleSource';

// The Settings area is another screen's concern: the shell only hands it the section.
vi.mock('./screens/SettingsRoute', () => ({
  SettingsRoute: ({ section, layoutId }: { section: string; layoutId?: string }) => (
    <h1>
      Settings stub {section}
      {layoutId ? ` ${layoutId}` : ''}
    </h1>
  ),
}));

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
      { id: 'm', name: 'Checkout API', groupId: 'g', type: 'HTTP', status: 'DOWN', value: null, since: iso(5) },
      { id: 'n', name: 'Invoices', groupId: 'g', type: 'HTTP', status: 'OK', value: null, since: iso(50) },
    ]),
    listConnections: vi.fn().mockResolvedValue([]),
    previewMonitor: vi.fn(),
    createMonitor: vi.fn(),
    listIncidents: vi.fn().mockResolvedValue([incident]),
    getIncident: vi.fn().mockResolvedValue(incident),
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
  localStorage.clear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  dismissAllToasts();
  window.location.hash = '';
});

describe('FE-63 console shell', () => {
  it('the sidebar has the primary sections, "More", then Settings and the wall', async () => {
    render(<ConsoleApp api={api()} />);
    const nav = await screen.findByRole('navigation', { name: 'Console sections' });
    expect(within(nav).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '#/', '#/incidents', '#/maintenance', '#/reports', '#/status-pages', '#/dependencies', '#/audit', '#/settings', '/wall.html',
    ]);
    expect(within(nav).getByText('More')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Monitors' })).toHaveAttribute('aria-current', 'page');
  });

  it('Incidents shows the open count, named for screen readers', async () => {
    render(<ConsoleApp api={api()} />);
    const nav = await screen.findByRole('navigation', { name: 'Console sections' });
    expect(await within(nav).findByRole('link', { name: 'Incidents, 1 open incident' })).toHaveAttribute('href', '#/incidents');
  });

  it('a monitor detail or edit address keeps Monitors current', async () => {
    render(<ConsoleApp api={api()} />);
    const nav = await screen.findByRole('navigation', { name: 'Console sections' });
    await go('#/monitors/m');
    expect(within(nav).getByRole('link', { name: 'Monitors' })).toHaveAttribute('aria-current', 'page');
    await go('#/settings/appearance');
    expect(within(nav).getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
  });

  it('#/settings/:section reaches the Settings area with its section and layout', async () => {
    render(<ConsoleApp api={api()} />);
    await go('#/settings');
    expect(await screen.findByRole('heading', { name: 'Settings stub general' })).toBeInTheDocument();
    await go('#/settings/wall-layouts/l-noc');
    expect(screen.getByRole('heading', { name: 'Settings stub wall-layouts l-noc' })).toBeInTheDocument();
  });

  it('legacy addresses redirect to their new place', async () => {
    render(<ConsoleApp api={api()} />);
    await go('#/settings/themes');
    expect(window.location.hash).toBe('#/settings/appearance');
    expect(await screen.findByRole('heading', { name: 'Settings stub appearance' })).toBeInTheDocument();
    await go('#/layouts/l-exec');
    expect(window.location.hash).toBe('#/settings/wall-layouts/l-exec');
    await go('#/admin/audit');
    expect(window.location.hash).toBe('#/audit');
  });

  it('an unknown address explains itself and leads back to the monitors', async () => {
    render(<ConsoleApp api={api()} />);
    await screen.findByText('Checkout API');
    await go('#/nope');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back to monitors' }));
    expect(window.location.hash).toBe('#/');
  });

  it('"Search or jump…" opens the palette, which finds incidents by monitor name', async () => {
    render(<ConsoleApp api={api()} />);
    await screen.findByText('Invoices');
    await userEvent.click(screen.getAllByRole('button', { name: 'Search or jump…' })[0]!);
    const dialog = screen.getByRole('dialog', { name: 'Search or jump to' });
    await userEvent.keyboard('checkout');
    expect(within(dialog).getByRole('group', { name: 'Open incidents' })).toHaveTextContent('Checkout API');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(window.location.hash).toBe('#/incidents/inc-1');
  });

  it('the palette opens a monitor detail and jumps to Settings sections', async () => {
    render(<ConsoleApp api={api()} />);
    await screen.findByText('Invoices');
    await userEvent.keyboard('{Control>}k{/Control}');
    await userEvent.keyboard('invoices{Enter}');
    expect(window.location.hash).toBe('#/monitors/n');
    await userEvent.keyboard('{Control>}k{/Control}');
    await userEvent.keyboard('connections{Enter}');
    expect(window.location.hash).toBe('#/settings/connections');
  });

  it('the mobile menu opens an accessible drawer that closes on Escape and after following a link', async () => {
    render(<ConsoleApp api={api()} />);
    await screen.findByText('Invoices');
    const menu = screen.getByRole('button', { name: 'Open navigation' });
    await userEvent.click(menu);
    const drawer = screen.getByRole('dialog', { name: 'Navigation' });
    expect(within(drawer).getByRole('link', { name: 'Monitors' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Navigation' })).toBeNull();
    expect(menu).toHaveFocus();
    await userEvent.click(menu);
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Navigation' })).getByRole('link', { name: 'Reports' }));
    expect(screen.queryByRole('dialog', { name: 'Navigation' })).toBeNull();
  });

  it('editors toggle Customize mode from the palette (no header button)', async () => {
    render(<ConsoleApp api={api()} />);
    await screen.findByText('Invoices');
    expect(screen.queryByRole('region', { name: 'Customize' })).toBeNull();
    await userEvent.keyboard('{Control>}k{/Control}');
    await userEvent.keyboard('customize mode{Enter}');
    expect(await screen.findByRole('region', { name: 'Customize' })).toBeInTheDocument();
  });

  it('demo mode never calls the API nor opens the live feed', async () => {
    const live = api();
    const connectFeed = vi.fn(() => () => {});
    const customizationApi = {
      load: vi.fn(),
      saveScope: vi.fn(),
      deleteEntry: vi.fn(),
      saveProfile: vi.fn(),
      loadTerminology: vi.fn(),
      saveTerminology: vi.fn(),
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<ConsoleApp api={live} demo connectFeed={connectFeed} customizationApi={customizationApi} />);
    expect(await screen.findByRole('note')).toHaveTextContent('Showing demo data');
    await screen.findByText('Reconciliation queue');
    expect(live.getAccess).not.toHaveBeenCalled();
    expect(live.listMonitors).not.toHaveBeenCalled();
    expect(connectFeed).not.toHaveBeenCalled();
    expect(customizationApi.load).not.toHaveBeenCalled();
    expect(customizationApi.loadTerminology).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('mounts one toast viewport', async () => {
    render(<ConsoleApp api={api()} />);
    await screen.findByText('Invoices');
    expect(screen.getAllByRole('region', { name: 'Notifications' })).toHaveLength(1);
  });
});
