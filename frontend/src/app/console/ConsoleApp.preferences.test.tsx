import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOperatorStore } from '@/domains/security/operator';
import { createPreferencesStore } from '@/shared/preferences/preferences';
import { ConsoleApp } from './ConsoleApp';
import type { ConsoleApi } from './consoleSource';

function api(): ConsoleApi {
  return {
    getAccess: vi.fn().mockResolvedValue({ mode: 'edit', client: 'loopback' }),
    listGroups: vi.fn().mockResolvedValue([]),
    listMonitors: vi.fn().mockResolvedValue([]),
    listConnections: vi.fn().mockResolvedValue([]),
    previewMonitor: vi.fn(),
    createMonitor: vi.fn(),
  };
}

function namedStore() {
  const store = createOperatorStore();
  store.getState().setName('M. Chiodi');
  return store;
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  delete document.documentElement.dataset.density;
  document.documentElement.style.removeProperty('--density-scale');
});

describe('FE-50 / FE-07 device preferences in the console', () => {
  it('opens the preferences screen from the header and applies the density at once', async () => {
    render(<ConsoleApp api={api()} operatorStore={namedStore()} preferencesStore={createPreferencesStore()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Device preferences' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Device preferences' })).toBeInTheDocument();
    expect(document.documentElement.dataset.density).toBe('comfortable');
    await userEvent.selectOptions(screen.getByLabelText('Density'), 'compact');
    expect(document.documentElement.dataset.density).toBe('compact');
  });

  it('an operator name chosen in the preferences becomes the declared operator', async () => {
    const operatorStore = namedStore();
    render(<ConsoleApp api={api()} operatorStore={operatorStore} preferencesStore={createPreferencesStore()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Device preferences' }));
    const input = screen.getByLabelText('Operator name');
    await userEvent.clear(input);
    await userEvent.type(input, 'Ana Souza{Enter}');
    expect(operatorStore.getState().name).toBe('Ana Souza');
  });

  it('the animation level preference drives the console motion level', async () => {
    const preferences = createPreferencesStore();
    preferences.getState().set('animation', 'minimal');
    render(<ConsoleApp api={api()} operatorStore={namedStore()} preferencesStore={preferences} />);
    await screen.findByRole('button', { name: 'Device preferences' });
    expect(document.documentElement.dataset.animation).toBe('minimal');
  });
});
