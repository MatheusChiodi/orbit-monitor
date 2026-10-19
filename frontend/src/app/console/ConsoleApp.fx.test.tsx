import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOperatorStore } from '@/domains/security/operator';
import { ConsoleApp } from './ConsoleApp';
import type { ConsoleApi } from './consoleSource';

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
    const { container } = render(<ConsoleApp api={api([])} operatorStore={createOperatorStore()} />);
    expect(container.querySelector('.fx-backdrop')).toHaveAttribute('aria-hidden', 'true');
  });

  it('first run: the Orbit boot intro sits beside the operator name prompt', () => {
    render(<ConsoleApp api={api([])} operatorStore={createOperatorStore()} />);
    expect(screen.getByRole('figure', { name: 'Animated introduction' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play intro' })).toBeInTheDocument();
  });

  it('empty monitor list: first-monitor and check-flow guides', async () => {
    const store = createOperatorStore();
    store.getState().setName('M. Chiodi');
    render(<ConsoleApp api={api([])} operatorStore={store} />);
    expect(await screen.findAllByRole('figure', { name: 'Animated introduction' })).toHaveLength(2);
  });

  it('with monitors there is no guide', async () => {
    const store = createOperatorStore();
    store.getState().setName('M. Chiodi');
    const monitor = { id: 'm', name: 'Web portal', groupId: 'g', type: 'HTTP', status: 'OK', value: 120, unit: 'ms', since: new Date().toISOString() };
    render(<ConsoleApp api={api([monitor])} operatorStore={store} />);
    expect(await screen.findByText('Web portal')).toBeInTheDocument();
    expect(screen.queryByRole('figure', { name: 'Animated introduction' })).toBeNull();
  });

  it('FE-59: with monitors the list opens with the interactive living orb', async () => {
    const store = createOperatorStore();
    store.getState().setName('M. Chiodi');
    const monitor = { id: 'm', name: 'Web portal', groupId: 'g', type: 'HTTP', status: 'OK', value: 120, unit: 'ms', since: new Date().toISOString() };
    render(<ConsoleApp api={api([monitor])} operatorStore={store} />);
    const orb = await screen.findByRole('group', { name: 'System orb' });
    expect(orb).toHaveAccessibleDescription('1 monitor in 1 group, all OK');
    expect(orb).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('button', { name: 'Legend' })).toBeInTheDocument();
  });
});
