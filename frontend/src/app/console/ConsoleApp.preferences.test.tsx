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
  window.location.hash = '';
  delete document.documentElement.dataset.density;
  document.documentElement.style.removeProperty('--density-scale');
});

function go(hash: string) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

describe('FE-50 / FE-07 device preferences in the console (Settings › Appearance)', () => {
  it('density is set in Settings › Appearance and applies at once', async () => {
    go('#/settings/appearance');
    render(<ConsoleApp api={api()} preferencesStore={createPreferencesStore()} />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(document.documentElement.dataset.density).toBe('comfortable');
    await userEvent.click(await screen.findByRole('radio', { name: 'Compact' }));
    expect(document.documentElement.dataset.density).toBe('compact');
  });

  it('the header has no device preferences button and no operator name field anywhere', async () => {
    go('#/settings/advanced');
    render(<ConsoleApp api={api()} preferencesStore={createPreferencesStore()} />);
    expect(await screen.findByLabelText('Viewing distance')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Device preferences' })).toBeNull();
    expect(screen.queryByLabelText('Operator name')).toBeNull();
  });

  it('the animation level preference drives the console motion level', async () => {
    const preferences = createPreferencesStore();
    preferences.getState().set('animation', 'minimal');
    render(<ConsoleApp api={api()} preferencesStore={preferences} />);
    await vi.waitFor(() => expect(document.documentElement.dataset.animation).toBe('minimal'));
  });
});
