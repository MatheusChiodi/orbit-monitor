import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnimationLevelProvider } from '@/shared/motion';
import { ORBIT_DARK, ThemeProvider, loadDevicePrefs, type OrbitTheme } from '@/shared/theme';
import { AppearanceSettings } from './AppearanceSettings';

const custom: OrbitTheme = { ...ORBIT_DARK, id: 'noc-night', name: 'NOC night', category: 'custom' };

function setup(props: Partial<Parameters<typeof AppearanceSettings>[0]> & { customThemes?: OrbitTheme[] } = {}) {
  const target = document.createElement('div');
  const { customThemes = [], ...rest } = props;
  const handlers = { onSaveCustom: vi.fn(), onDeleteCustom: vi.fn(), ...rest };
  render(
    <AnimationLevelProvider level="off" prefersReducedMotion={false}>
      <ThemeProvider target={target} search="" customThemes={customThemes}>
        <AppearanceSettings {...handlers} />
      </ThemeProvider>
    </AnimationLevelProvider>,
  );
  return { target, ...handlers };
}

beforeEach(() => localStorage.clear());

describe('Settings → Appearance', () => {
  it('shows the gallery first', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Appearance' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search themes' })).toBeInTheDocument();
  });

  it('duplicate & edit opens the editor, saving stores the custom theme and applies it', async () => {
    const { onSaveCustom } = setup();
    await userEvent.click(within(screen.getByRole('listitem', { name: 'Nord' })).getByRole('button', { name: 'Duplicate & edit' }));
    expect(screen.getByRole('form', { name: 'Theme editor' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save theme' }));
    expect(onSaveCustom).toHaveBeenCalledWith(expect.objectContaining({ name: 'Nord (copy)', basedOn: 'nord', category: 'custom' }));
    expect(screen.queryByRole('form', { name: 'Theme editor' })).toBeNull();
    expect(loadDevicePrefs().themeId).toBe('nord-copy');
  });

  it('cancel returns to the gallery without saving', async () => {
    const { onSaveCustom } = setup({ customThemes: [custom] });
    await userEvent.click(screen.getByRole('button', { name: 'Custom' }));
    await userEvent.click(within(screen.getByRole('listitem', { name: 'NOC night' })).getByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSaveCustom).not.toHaveBeenCalled();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('following the system light/dark setting is a device choice', async () => {
    setup();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Follow the system light/dark setting' }));
    expect(loadDevicePrefs().themeId).toBe('system');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Follow the system light/dark setting' }));
    expect(loadDevicePrefs().themeId).toBeNull();
  });

  it('can make the current theme the workspace default', async () => {
    const onSetWorkspaceDefault = vi.fn();
    setup({ onSetWorkspaceDefault });
    await userEvent.click(within(screen.getByRole('listitem', { name: 'Nord' })).getByRole('button', { name: 'Use Nord' }));
    await userEvent.click(screen.getByRole('button', { name: 'Make workspace default' }));
    expect(onSetWorkspaceDefault).toHaveBeenCalledWith('nord');
  });

  it('view-only devices see a notice and cannot edit or set the workspace default', () => {
    setup({ readOnly: true, onSetWorkspaceDefault: vi.fn() });
    expect(screen.getByText(/View only/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Make workspace default' })).toBeNull();
  });
});
