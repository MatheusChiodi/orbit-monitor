import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomizationProvider } from '@/shared/customization/CustomizationProvider';
import { createCustomizationStore } from '@/shared/customization/store';
import { AnimationLevelProvider } from '@/shared/motion';
import { createPreferencesStore } from '@/shared/preferences/preferences';
import { ORBIT_DARK, ThemeProvider, loadDevicePrefs, type OrbitTheme } from '@/shared/theme';
import { AppearanceSettings } from './AppearanceSettings';

const custom: OrbitTheme = { ...ORBIT_DARK, id: 'noc-night', name: 'NOC night', category: 'custom' };

function setup(props: Partial<Parameters<typeof AppearanceSettings>[0]> & { customThemes?: OrbitTheme[] } = {}) {
  const target = document.createElement('div');
  const { customThemes = [], ...rest } = props;
  const handlers = { onSaveCustom: vi.fn(), onDeleteCustom: vi.fn(), ...rest };
  const customization = createCustomizationStore({ storage: false });
  render(
    <AnimationLevelProvider level="off" prefersReducedMotion={false}>
      <CustomizationProvider store={customization}>
        <ThemeProvider target={target} search="" customThemes={customThemes}>
          <AppearanceSettings {...handlers} />
        </ThemeProvider>
      </CustomizationProvider>
    </AnimationLevelProvider>,
  );
  return { target, customization, ...handlers };
}

const use = (name: string) => userEvent.click(within(screen.getByRole('listitem', { name })).getByRole('button', { name: `Use ${name}` }));

beforeEach(() => localStorage.clear());

describe('FE-72 Settings › Appearance', () => {
  it('has no title of its own (the Settings page and section already name it)', () => {
    setup();
    expect(screen.queryByRole('heading', { name: 'Appearance' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Theme' })).toBeInTheDocument();
  });

  it('choosing a theme previews it; "Use on this device" applies it', async () => {
    const { target } = setup();
    expect(screen.getByRole('button', { name: 'Use on this device' })).toBeDisabled();
    await use('Nord');
    expect(target.dataset.theme).toBe('nord');
    expect(screen.getByText('Previewing Nord: not applied yet')).toBeInTheDocument();
    expect(loadDevicePrefs().themeId).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Use on this device' }));
    expect(loadDevicePrefs().themeId).toBe('nord');
    expect(screen.getByText('Nord is in use on this device')).toBeInTheDocument();
  });

  it('the footer actions stay in a sticky bar', () => {
    setup({ onSetWorkspaceDefault: vi.fn() });
    const bar = document.querySelector('[data-sticky-action-bar]') as HTMLElement;
    expect(within(bar).getByRole('button', { name: 'Use on this device' })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Make workspace default' })).toBeInTheDocument();
  });

  it('"Make workspace default" saves the chosen theme with the density and animation', async () => {
    const onSetWorkspaceDefault = vi.fn();
    const preferences = createPreferencesStore({ density: 'compact', animation: 'minimal' });
    setup({ onSetWorkspaceDefault, preferences });
    await use('Nord');
    await userEvent.click(screen.getByRole('button', { name: 'Make workspace default' }));
    expect(onSetWorkspaceDefault).toHaveBeenCalledWith('nord', { density: 'compact', animation: 'minimal' });
  });

  it('density, text size and animation are one control each and apply to this device', async () => {
    const preferences = createPreferencesStore();
    const { customization } = setup({ preferences });
    expect(screen.getAllByRole('radiogroup', { name: 'Animation' })).toHaveLength(1);
    expect(screen.queryByRole('slider')).toBeNull();
    await userEvent.click(screen.getByRole('radio', { name: 'Compact' }));
    expect(preferences.getState().device.density).toBe('compact');
    await userEvent.click(screen.getByRole('radio', { name: 'Minimal' }));
    expect(preferences.getState().device.animation).toBe('minimal');
    await userEvent.click(screen.getByRole('radio', { name: 'Large' }));
    expect(customization.getState().resolve('typography.scale').value).toBe(1.15);
  });

  it('duplicate & edit opens the editor; saving stores the custom theme and applies it', async () => {
    const { onSaveCustom } = setup();
    await userEvent.click(within(screen.getByRole('listitem', { name: 'Nord' })).getByRole('button', { name: 'More actions for Nord' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Duplicate & edit' }));
    expect(screen.getByRole('form', { name: 'Theme editor' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save theme' }));
    expect(onSaveCustom).toHaveBeenCalledWith(expect.objectContaining({ name: 'Nord (copy)', basedOn: 'nord', category: 'custom' }));
    expect(loadDevicePrefs().themeId).toBe('nord-copy');
  });

  it('cancel in the editor returns to the gallery without saving', async () => {
    const { onSaveCustom } = setup({ customThemes: [custom] });
    await userEvent.click(within(screen.getByRole('listitem', { name: 'NOC night' })).getByRole('button', { name: 'More actions for NOC night' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSaveCustom).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Theme' })).toBeInTheDocument();
  });

  it('following the system light/dark mode is a device switch', async () => {
    setup();
    await userEvent.click(screen.getByRole('switch', { name: 'Follow the system light or dark mode' }));
    expect(loadDevicePrefs().themeId).toBe('system');
    await userEvent.click(screen.getByRole('switch', { name: 'Follow the system light or dark mode' }));
    expect(loadDevicePrefs().themeId).toBeNull();
  });

  it('view-only devices see a notice and cannot set the workspace default', () => {
    setup({ readOnly: true, onSetWorkspaceDefault: vi.fn() });
    expect(screen.getByText(/View only/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Make workspace default' })).toBeNull();
  });
});
