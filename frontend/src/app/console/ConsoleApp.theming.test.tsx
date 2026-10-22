import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WallLayout } from '@/domains/workspace/layout/layoutsApi';
import { createPreferencesStore } from '@/shared/preferences/preferences';
import { ORBIT_DARK } from '@/shared/theme/registry';
import { ConsoleApp, type ConsoleAppProps } from './ConsoleApp';
import type { ConsoleApi } from './consoleSource';

function api(mode: 'edit' | 'view-only' = 'edit'): ConsoleApi {
  return {
    getAccess: vi.fn().mockResolvedValue({ mode, client: mode === 'edit' ? 'loopback' : 'lan' }),
    getWorkspaceDefaults: vi.fn().mockResolvedValue({ theme: 'nord', animation: 'standard' }),
    listGroups: vi.fn().mockResolvedValue([]),
    listMonitors: vi.fn().mockResolvedValue([]),
    listConnections: vi.fn().mockResolvedValue([]),
    previewMonitor: vi.fn(),
    createMonitor: vi.fn(),
  };
}

const custom = { ...ORBIT_DARK, id: 'noc-night', name: 'NOC night', category: 'custom' };

function themesClient(items: unknown[] = []) {
  return {
    list: vi.fn().mockResolvedValue({ version: 1, items }),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue(undefined),
  };
}

const noc: WallLayout = { id: 'l-noc', slug: 'noc', name: 'NOC', blocks: [{ id: 'hero', kind: 'hero', x: 0, y: 0, w: 8, h: 6 }] };
const exec: WallLayout = { id: 'l-exec', slug: 'exec', name: 'Executive', blocks: [{ id: 'uptime', kind: 'uptime', x: 0, y: 0, w: 6, h: 2 }] };

function setup(props: Partial<ConsoleAppProps> = {}) {
  const preferences = createPreferencesStore();
  const defaultsApi = { save: vi.fn(async (d: { theme?: string }) => d) };
  const layoutsApi = { list: vi.fn().mockResolvedValue([noc, exec]), save: vi.fn(async (l: WallLayout) => l) };
  const configClient = themesClient([custom]);
  render(
    <ConsoleApp
      api={api()}
     
      preferencesStore={preferences}
      saveDefaults={defaultsApi.save}
      layoutsApi={layoutsApi}
      configClient={configClient}
      {...props}
    />,
  );
  return { preferences, defaultsApi, layoutsApi, configClient };
}

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  window.location.hash = '';
  delete document.documentElement.dataset.theme;
  document.documentElement.removeAttribute('style');
});

describe('FE-03 / FE-50 / BE-40 console theme', () => {
  it('workspace defaults from /api/settings/defaults feed the preferences and apply when the device has no choice', async () => {
    const { preferences } = setup();
    await waitFor(() => expect(preferences.getState().defaults.theme).toBe('nord'));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('nord'));
  });

  it('the theme chosen in device preferences (FE-50) is applied to the console', async () => {
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Device preferences' }));
    await userEvent.selectOptions(screen.getByLabelText('Theme'), 'dracula');
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dracula'));
  });

  it('Settings → Appearance: choosing a theme in the gallery becomes the device preference', async () => {
    const { preferences, configClient } = setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Appearance' }));
    expect(window.location.hash).toBe('#/settings/themes');
    await userEvent.click(await screen.findByRole('button', { name: 'Use Kanagawa' }));
    expect(preferences.getState().device.theme).toBe('kanagawa');
    expect(document.documentElement.dataset.theme).toBe('kanagawa');
    expect(configClient.list).toHaveBeenCalledWith('themes');
  });

  it('custom themes from /api/themes are listed and "Make workspace default" saves BE-40 defaults', async () => {
    const { defaultsApi, preferences } = setup();
    window.location.hash = '';
    await userEvent.click(await screen.findByRole('button', { name: 'Appearance' }));
    expect(await screen.findByRole('button', { name: 'Use NOC night' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Make workspace default' }));
    await waitFor(() => expect(defaultsApi.save).toHaveBeenCalledWith(expect.objectContaining({ theme: expect.any(String) })));
    await waitFor(() => expect(preferences.getState().defaults.theme).toBe(defaultsApi.save.mock.calls[0]?.[0].theme));
  });

  it('`#/settings/themes` opens Appearance directly', async () => {
    window.location.hash = '#/settings/themes';
    setup();
    expect(await screen.findByRole('heading', { level: 1, name: 'Appearance' })).toBeInTheDocument();
  });
});

describe('FE-11 console route for the layout editor', () => {
  it('`#/layouts` lists the saved layouts and edits one with its theme, animation and playlist', async () => {
    window.location.hash = '#/layouts';
    const { layoutsApi } = setup();
    expect(await screen.findByRole('heading', { level: 1, name: 'Wall layouts' })).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Executive' }));
    expect(window.location.hash).toBe('#/layouts/l-exec');
    expect(screen.getByRole('link', { name: 'Open on the wall' })).toHaveAttribute('href', '/wall/exec');

    await userEvent.selectOptions(screen.getByLabelText('Theme on this wall'), 'nord');
    await userEvent.selectOptions(screen.getByLabelText('Animation on this wall'), 'minimal');
    await userEvent.click(screen.getByRole('button', { name: 'Add to playlist' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add to playlist' }));
    await userEvent.selectOptions(screen.getByLabelText('Layout 2'), 'noc');
    await userEvent.clear(screen.getByLabelText('Seconds on screen for layout 2'));
    await userEvent.type(screen.getByLabelText('Seconds on screen for layout 2'), '30');
    await userEvent.click(screen.getByRole('button', { name: 'Save layout' }));

    await waitFor(() => expect(layoutsApi.save).toHaveBeenCalled());
    expect(layoutsApi.save.mock.calls[0]?.[0]).toMatchObject({
      id: 'l-exec',
      themeId: 'nord',
      animationLevel: 'minimal',
      playlist: { entries: [{ layout: 'exec', seconds: 60 }, { layout: 'noc', seconds: 30 }] },
    });
    expect(await screen.findByText('Layout "Executive" saved')).toBeInTheDocument();
  });

  it('the editor previews the grid in the layout theme', async () => {
    window.location.hash = '#/layouts/l-exec';
    setup({ layoutsApi: { list: vi.fn().mockResolvedValue([{ ...exec, themeId: 'github-light' }]), save: vi.fn() } });
    const grid = await screen.findByRole('application', { name: 'Wall layout editor' });
    const scope = grid.closest<HTMLElement>('[data-theme-preview]');
    expect(scope?.dataset.themePreview).toBe('github-light');
    expect(scope?.style.getPropertyValue('--color-bg')).not.toBe('');
  });

  it('a new layout gets a free slug and can be saved', async () => {
    window.location.hash = '#/layouts';
    const { layoutsApi } = setup();
    await userEvent.click(await screen.findByRole('button', { name: 'New layout' }));
    const slug = screen.getByLabelText('Address (/wall/…)');
    expect((slug as HTMLInputElement).value).toBe('layout-3');
    await userEvent.click(screen.getByRole('button', { name: 'Save layout' }));
    await waitFor(() => expect(layoutsApi.save).toHaveBeenCalledWith(expect.objectContaining({ slug: 'layout-3' })));
  });

  it('view-only clients see the layouts read-only', async () => {
    window.location.hash = '#/layouts/l-noc';
    setup({ api: api('view-only') });
    const grid = await screen.findByRole('application', { name: 'Wall layout editor' });
    expect(grid).toHaveAttribute('aria-readonly', 'true');
    expect(screen.queryByRole('button', { name: 'Save layout' })).toBeNull();
    expect(within(screen.getByRole('group', { name: 'Layout settings' })).getByLabelText('Theme on this wall')).toBeDisabled();
  });
});

