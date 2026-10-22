import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    render(<ConsoleApp api={api()} preferencesStore={createPreferencesStore()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Device preferences' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Device preferences' })).toBeInTheDocument();
    expect(document.documentElement.dataset.density).toBe('comfortable');
    await userEvent.selectOptions(screen.getByLabelText('Density'), 'compact');
    expect(document.documentElement.dataset.density).toBe('compact');
  });

  it('the preferences screen has no operator name field', async () => {
    render(<ConsoleApp api={api()} preferencesStore={createPreferencesStore()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Device preferences' }));
    expect(screen.getByLabelText('Density')).toBeInTheDocument();
    expect(screen.queryByLabelText('Operator name')).toBeNull();
  });

  it('the animation level preference drives the console motion level', async () => {
    const preferences = createPreferencesStore();
    preferences.getState().set('animation', 'minimal');
    render(<ConsoleApp api={api()} preferencesStore={preferences} />);
    await screen.findByRole('button', { name: 'Device preferences' });
    expect(document.documentElement.dataset.animation).toBe('minimal');
  });
});
