import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CustomizationProvider } from '@/shared/customization/CustomizationProvider';
import { createCustomizeModeStore } from '@/shared/customization/customizeMode';
import { createCustomizationStore } from '@/shared/customization/store';
import { ThemeProvider } from '@/shared/theme';
import { createPreferencesStore } from '@/shared/preferences/preferences';
import { ConsoleProvider } from '../../ConsoleContext';
import { DEMO_ACCESS, createConsoleSource, type ConsoleApi } from '../../consoleSource';
import { SettingsRoute, type SettingsSection } from './SettingsRoute';

function setup(section: SettingsSection, layoutId?: string, layouts: unknown[] = []) {
  const source = createConsoleSource({} as ConsoleApi, true);
  const services = {
    themesClient: { list: vi.fn().mockResolvedValue([]), save: vi.fn(), remove: vi.fn() },
    layoutsApi: { list: vi.fn().mockResolvedValue(layouts), save: vi.fn(), remove: vi.fn().mockResolvedValue(undefined) },
    saveDefaults: vi.fn(async (d) => d),
  };
  const customization = createCustomizationStore({ storage: false });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ConsoleProvider value={{ source, access: DEMO_ACCESS, editable: true, demo: true, navigate: vi.fn() }}>
        <CustomizationProvider store={customization} mode={createCustomizeModeStore(customization)}>
          <ThemeProvider target={document.createElement('div')} search="">
            <SettingsRoute section={section} layoutId={layoutId} preferences={createPreferencesStore()} services={services as never} />
          </ThemeProvider>
        </CustomizationProvider>
      </ConsoleProvider>
    </QueryClientProvider>,
  );
  return services;
}

afterEach(() => localStorage.clear());

describe('FE-72 Settings area', () => {
  it('is one page titled Settings with a sub-nav of six sections', () => {
    setup('general');
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Settings sections' });
    expect(within(nav).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '#/settings',
      '#/settings/appearance',
      '#/settings/notifications',
      '#/settings/wall-layouts',
      '#/settings/connections',
      '#/settings/advanced',
    ]);
  });

  it('marks the current section and names it once', () => {
    setup('appearance');
    const nav = screen.getByRole('navigation', { name: 'Settings sections' });
    expect(within(nav).getByRole('link', { name: /Appearance/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('heading', { name: 'Appearance' })).toHaveLength(1);
  });

  it('on small screens a select jumps between sections', async () => {
    setup('general');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Section' }), 'advanced');
    expect(window.location.hash).toBe('#/settings/advanced');
  });

  it('General shows the language and the configuration files', async () => {
    setup('general');
    expect(await screen.findByRole('heading', { name: 'Configuration files' })).toBeInTheDocument();
  });

  it('Advanced holds Customize mode, the registry, profiles and terminology', async () => {
    setup('advanced');
    expect(screen.getByRole('switch', { name: 'Customize mode' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All settings' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Profiles' })).toBeInTheDocument();
  });

  it('Wall layouts invites to create the first layout', async () => {
    setup('wall-layouts');
    expect(await screen.findByText('No wall layout yet. Create one from a template.')).toBeInTheDocument();
  });

  it('Connections renders even before its screen exists', () => {
    setup('connections');
    expect(screen.getAllByRole('heading', { name: 'Connections' }).length).toBeGreaterThan(0);
  });

  it('Wall layouts offers Delete when the layouts API can remove, and calls it after confirming', async () => {
    const layout = { id: 'l-noc', slug: 'noc', name: 'NOC', blocks: [{ id: 'hero', kind: 'hero', x: 0, y: 0, w: 6, h: 4 }] };
    const services = setup('wall-layouts', 'l-noc', [layout]);
    await userEvent.click(await screen.findByRole('button', { name: 'More actions for NOC' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete layout' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Delete NOC?' })).getByRole('button', { name: 'Delete layout' }));
    expect(services.layoutsApi.remove).toHaveBeenCalledWith('l-noc');
  });
});
