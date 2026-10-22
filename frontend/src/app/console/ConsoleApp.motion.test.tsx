import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPreferencesStore } from '@/shared/preferences/preferences';
import { ConsoleApp } from './ConsoleApp';
import type { ConsoleApi } from './consoleSource';

function api(overrides: Partial<ConsoleApi> = {}): ConsoleApi {
  return {
    getAccess: vi.fn().mockResolvedValue({ mode: 'edit', client: 'loopback' }),
    listGroups: vi.fn().mockResolvedValue([]),
    listMonitors: vi.fn().mockResolvedValue([]),
    listConnections: vi.fn().mockResolvedValue([]),
    previewMonitor: vi.fn(),
    createMonitor: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
  for (const key of Object.keys(document.documentElement.dataset)) delete document.documentElement.dataset[key];
});

describe('FE-06 animation settings in the console', () => {
  it('device overrides reach the document (attention off, speed) and the FX level', async () => {
    const preferences = createPreferencesStore();
    preferences.getState().setMotion({ attention: false, speed: 0.5, fx: 'high' });
    render(<ConsoleApp api={api()} preferencesStore={preferences} />);
    await screen.findByRole('button', { name: 'Device preferences' });
    const root = document.documentElement;
    expect(root.dataset.motionAttention).toBe('off');
    expect(root.style.getPropertyValue('--motion-speed')).toBe('0.5');
    expect(root.dataset.fx).toBe('expressive');
  });

  it('?motion= overrides the device choice', async () => {
    window.history.replaceState(null, '', '/?motion=minimal');
    const preferences = createPreferencesStore();
    preferences.getState().setAnimationPreset('expressive');
    render(<ConsoleApp api={api()} preferencesStore={preferences} />);
    await screen.findByRole('button', { name: 'Device preferences' });
    expect(document.documentElement.dataset.animation).toBe('minimal');
  });

  it('FE-50: workspace defaults from /api/settings/defaults apply under the device choices', async () => {
    const preferences = createPreferencesStore();
    const getWorkspaceDefaults = vi.fn().mockResolvedValue({ animation: 'minimal', density: 'compact' });
    render(<ConsoleApp api={api({ getWorkspaceDefaults })} preferencesStore={preferences} />);
    await screen.findByRole('button', { name: 'Device preferences' });
    await vi.waitFor(() => expect(document.documentElement.dataset.animation).toBe('minimal'));
    expect(preferences.getState().effective.density).toBe('compact');
  });
});
