import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fromEntries, type CustomizationApi } from '@/shared/customization/api';
import { createCustomizationStore } from '@/shared/customization/store';
import { createPreferencesStore } from '@/shared/preferences/preferences';
import { ConsoleApp } from './ConsoleApp';
import type { ConsoleApi } from './consoleSource';

function api(mode: 'edit' | 'view-only' = 'edit'): ConsoleApi {
  return {
    getAccess: vi.fn().mockResolvedValue({ mode, client: mode === 'edit' ? 'loopback' : 'lan' }),
    listGroups: vi.fn().mockResolvedValue([{ id: 'g1', name: 'Payments' }]),
    listMonitors: vi.fn().mockResolvedValue([{ id: 'm1', name: 'Queue', groupId: 'g1', type: 'SQL', status: 'OK', value: 3, since: '2026-10-22T10:00:00Z' }]),
    listConnections: vi.fn().mockResolvedValue([]),
    previewMonitor: vi.fn(),
    createMonitor: vi.fn(),
  };
}

function customizationApi(): CustomizationApi {
  return {
    load: vi.fn(async () => ({ ...fromEntries([]), workspace: { 'shape.radius': 'sharp' } })),
    saveScope: vi.fn(async () => undefined),
    deleteEntry: vi.fn(async () => undefined),
    saveProfile: vi.fn(async () => undefined),
    loadTerminology: vi.fn(async () => ({ en: { 'ops.monitors.title': 'Checks' }, 'pt-BR': {} })),
    saveTerminology: vi.fn(async () => undefined),
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of Object.keys(document.documentElement.dataset)) delete document.documentElement.dataset[key];
  document.documentElement.removeAttribute('style');
  window.location.hash = '';
});

function go(hash: string) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

describe('CORE-21 customization in the console (Settings › Advanced)', () => {
  it('loads the workspace customization and shows the generated settings in Advanced', async () => {
    const preferences = createPreferencesStore();
    const store = createCustomizationStore({ api: customizationApi(), preferences });
    go('#/settings/advanced');
    render(<ConsoleApp api={api()} preferencesStore={preferences} customizationStore={store} />);
    expect(await screen.findByRole('tab', { name: 'All settings' })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Applies to' }), 'workspace');
    expect(await screen.findByRole('combobox', { name: 'Corner radius' })).toHaveValue('sharp');
    expect(document.documentElement.dataset.radius).toBe('sharp');
  });

  it('applies the renamed labels from orbit.terminology.json', async () => {
    const store = createCustomizationStore({ api: customizationApi() });
    render(<ConsoleApp api={api()} customizationStore={store} customizationApi={customizationApi()} />);
    expect((await screen.findAllByText('Checks')).length).toBeGreaterThan(0);
  });

  it('view-only clients see the settings but cannot change them, and get no Customize mode', async () => {
    const store = createCustomizationStore({ api: customizationApi() });
    go('#/settings/advanced');
    render(<ConsoleApp api={api('view-only')} customizationStore={store} />);
    expect(await screen.findByRole('combobox', { name: 'Corner radius' })).toBeDisabled();
    expect(screen.queryByRole('switch', { name: 'Customize mode' })).toBeNull();
    expect(screen.getByText('Only available on the machine running Orbit.')).toBeInTheDocument();
  });

  it('FE-53: editors turn Customize mode on in Advanced and get handles on the monitor list', async () => {
    const store = createCustomizationStore({ api: customizationApi() });
    go('#/settings/advanced');
    render(<ConsoleApp api={api()} customizationStore={store} />);
    await userEvent.click(await screen.findByRole('switch', { name: 'Customize mode' }));
    go('#/');
    expect(await screen.findByRole('button', { name: 'Customize Queue' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Customize Queue' }));
    expect(screen.getByRole('dialog', { name: 'Customize Queue' })).toBeInTheDocument();
  });

  it('FE-53: Ctrl+. toggles Customize mode anywhere for editors', async () => {
    const store = createCustomizationStore({ api: customizationApi() });
    render(<ConsoleApp api={api()} customizationStore={store} />);
    await screen.findAllByText('Queue');
    await userEvent.keyboard('{Control>}.{/Control}');
    expect(await screen.findByRole('button', { name: 'Customize Queue' })).toBeInTheDocument();
  });

  it('FE-57: Advanced has a profiles tab with the built-in profiles', async () => {
    const store = createCustomizationStore({ api: customizationApi() });
    go('#/settings/advanced');
    render(<ConsoleApp api={api()} customizationStore={store} />);
    await userEvent.click(await screen.findByRole('tab', { name: 'Profiles' }));
    expect(screen.getByRole('article', { name: 'TV wall' })).toBeInTheDocument();
  });
});
