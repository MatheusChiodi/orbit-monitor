import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOperatorStore } from '@/domains/security/operator';
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
    loadTerminology: vi.fn(async () => ({ en: { 'console.monitors.title': 'Checks' }, 'pt-BR': {} })),
    saveTerminology: vi.fn(async () => undefined),
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
  for (const key of Object.keys(document.documentElement.dataset)) delete document.documentElement.dataset[key];
  document.documentElement.removeAttribute('style');
});

describe('CORE-21 customization in the console', () => {
  it('loads the workspace customization and opens the generated settings screen', async () => {
    const preferences = createPreferencesStore();
    const store = createCustomizationStore({ api: customizationApi(), preferences });
    render(<ConsoleApp api={api()} operatorStore={namedStore()} preferencesStore={preferences} customizationStore={store} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Customization' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Customization' })).toBeInTheDocument();
    expect(await screen.findByRole('combobox', { name: 'Corner radius' })).toHaveValue('sharp');
    expect(document.documentElement.dataset.radius).toBe('sharp');
  });

  it('applies the renamed labels from orbit.terminology.json', async () => {
    const store = createCustomizationStore({ api: customizationApi() });
    render(<ConsoleApp api={api()} operatorStore={namedStore()} customizationStore={store} customizationApi={customizationApi()} />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Checks' })).toBeInTheDocument();
  });

  it('view-only clients see the settings but cannot change them', async () => {
    const store = createCustomizationStore({ api: customizationApi() });
    render(<ConsoleApp api={api('view-only')} operatorStore={namedStore()} customizationStore={store} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Customization' }));
    expect(await screen.findByRole('combobox', { name: 'Corner radius' })).toBeDisabled();
  });

  it('FE-53: editors get the Customize toggle (Ctrl+.) with handles on the monitor list', async () => {
    const store = createCustomizationStore({ api: customizationApi() });
    render(<ConsoleApp api={api()} operatorStore={namedStore()} customizationStore={store} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Customize' }));
    expect(await screen.findByRole('button', { name: 'Customize Queue' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Customize Queue' }));
    expect(screen.getByRole('dialog', { name: 'Customize Queue' })).toBeInTheDocument();
  });

  it('FE-53: view-only clients never see Customize', async () => {
    const store = createCustomizationStore({ api: customizationApi() });
    render(<ConsoleApp api={api('view-only')} operatorStore={namedStore()} customizationStore={store} />);
    expect(await screen.findByRole('button', { name: 'Customization' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Customize' })).not.toBeInTheDocument();
  });

  it('FE-57: the customization screen has a profiles tab with the built-in profiles', async () => {
    const store = createCustomizationStore({ api: customizationApi() });
    render(<ConsoleApp api={api()} operatorStore={namedStore()} customizationStore={store} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Customization' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Profiles' }));
    expect(screen.getByRole('article', { name: 'TV wall' })).toBeInTheDocument();
  });
});
