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

  it('empty monitor list: first-monitor and check-flow guides', async () => {
    render(<ConsoleApp api={api([])} />);
    expect(await screen.findAllByRole('figure', { name: 'Animated introduction' })).toHaveLength(2);
  });

  it('Orbit\'s own health check alone still counts as an empty workspace: the guides show', async () => {
    const self = { id: 'orbit_self', name: 'Orbit', groupId: null, type: 'SELF', status: 'OK', value: null, unit: null, since: new Date().toISOString() };
    render(<ConsoleApp api={api([self])} />);
    expect(await screen.findAllByRole('figure', { name: 'Animated introduction' })).toHaveLength(2);
  });

  it('with monitors there is no guide', async () => {
    const monitor = { id: 'm', name: 'Web portal', groupId: 'g', type: 'HTTP', status: 'OK', value: 120, unit: 'ms', since: new Date().toISOString() };
    render(<ConsoleApp api={api([monitor])} />);
    expect(await screen.findByText('Web portal')).toBeInTheDocument();
    expect(screen.queryByRole('figure', { name: 'Animated introduction' })).toBeNull();
  });

  it('FE-59: with monitors the list opens with the interactive living orb', async () => {
    const monitor = { id: 'm', name: 'Web portal', groupId: 'g', type: 'HTTP', status: 'OK', value: 120, unit: 'ms', since: new Date().toISOString() };
    render(<ConsoleApp api={api([monitor])} />);
    const orb = await screen.findByRole('group', { name: 'System orb' });
    expect(orb).toHaveAccessibleDescription('1 monitor in 1 group, all OK');
    expect(orb).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('button', { name: 'Legend' })).toBeInTheDocument();
  });
});
