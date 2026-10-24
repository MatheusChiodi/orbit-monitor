import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsoleApp } from './ConsoleApp';
import type { ConsoleApi } from './consoleSource';

// The Settings area is tested with its own screens; the shell only hands it the section.
vi.mock('./screens/SettingsRoute', () => ({ SettingsRoute: () => null }));

vi.mock('@remotion/player', () => ({ Player: () => <div data-testid="remotion-player" /> }));

function api(monitors: unknown[]): ConsoleApi {
  return {
    getAccess: vi.fn().mockResolvedValue({ mode: 'edit', client: 'loopback' }),
    listGroups: vi.fn().mockResolvedValue(monitors.length ? [{ id: 'g', name: 'Portal' }] : []),
    listMonitors: vi.fn().mockResolvedValue(monitors),
    listConnections: vi.fn().mockResolvedValue([]),
    previewMonitor: vi.fn(),
    createMonitor: vi.fn(),
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('FE-52 console FX', () => {
  it('draws the FX backdrop behind the console', () => {
    const { container } = render(<ConsoleApp api={api([])} />);
    expect(container.querySelector('.fx-backdrop')).toHaveAttribute('aria-hidden', 'true');
  });

  it('empty monitor list: the onboarding invites the first monitor', async () => {
    render(<ConsoleApp api={api([])} />);
    expect(await screen.findByRole('heading', { level: 2, name: 'Nothing in orbit yet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Monitor a URL/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Monitor a SELECT/ })).toBeInTheDocument();
  });

  it("Orbit's own health check alone still counts as an empty workspace", async () => {
    const self = { id: 'orbit_self', name: 'Orbit', groupId: null, type: 'SELF', status: 'OK', value: null, unit: null, since: new Date().toISOString() };
    render(<ConsoleApp api={api([self])} />);
    expect(await screen.findByRole('heading', { level: 2, name: 'Nothing in orbit yet' })).toBeInTheDocument();
  });

  it('with monitors there is no onboarding and the orbit rail lists them', async () => {
    const monitor = { id: 'm', name: 'Web portal', groupId: 'g', type: 'HTTP', status: 'OK', value: 120, unit: 'ms', since: new Date().toISOString() };
    render(<ConsoleApp api={api([monitor])} />);
    const rail = await screen.findByRole('region', { name: 'Monitors in orbit' });
    expect(rail).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Nothing in orbit yet' })).toBeNull();
  });
});
