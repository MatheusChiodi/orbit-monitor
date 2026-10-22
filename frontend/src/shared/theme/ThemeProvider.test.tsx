import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnimationLevelProvider } from '@/shared/motion';
import { DEVICE_THEME_KEY, loadDevicePrefs } from './deviceStore';
import { ORBIT_DARK } from './registry';
import { ThemeProvider, useTheme } from './ThemeProvider';
import type { OrbitTheme } from './types';

const custom: OrbitTheme = { ...ORBIT_DARK, id: 'noc-night', name: 'NOC night', category: 'custom' };

function Probe() {
  const t = useTheme();
  return (
    <div>
      <output aria-label="theme">{t.theme.id}</output>
      <output aria-label="source">{t.source}</output>
      <output aria-label="favorites">{t.favorites.join(',')}</output>
      <button onClick={() => t.setDeviceTheme('nord')}>device nord</button>
      <button onClick={() => t.preview('dracula')}>preview dracula</button>
      <button onClick={() => t.preview(null)}>end preview</button>
      <button onClick={() => t.toggleFavorite('kanagawa')}>fav</button>
      <button onClick={() => t.setDeviceTheme(null)}>restore default</button>
    </div>
  );
}

function setup(props: Partial<Parameters<typeof ThemeProvider>[0]> = {}, level: 'off' | 'standard' = 'standard') {
  const target = document.createElement('div');
  render(
    <AnimationLevelProvider level={level} prefersReducedMotion={false}>
      <ThemeProvider target={target} search="" {...props}>
        <Probe />
      </ThemeProvider>
    </AnimationLevelProvider>,
  );
  return target;
}

const value = (name: string) => screen.getByLabelText(name).textContent;

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('FE-03/FE-05 ThemeProvider', () => {
  it('applies Orbit Dark by default', () => {
    const target = setup();
    expect(value('theme')).toBe('orbit-dark');
    expect(value('source')).toBe('default');
    expect(target.dataset.theme).toBe('orbit-dark');
  });

  it('the workspace default applies when the device has no choice', () => {
    setup({ workspaceThemeId: 'kanagawa' });
    expect(value('theme')).toBe('kanagawa');
  });

  it('a device choice is saved on the device and beats the workspace default', async () => {
    const target = setup({ workspaceThemeId: 'kanagawa' });
    await userEvent.click(screen.getByText('device nord'));
    expect(value('theme')).toBe('nord');
    expect(target.style.getPropertyValue('--s1')).toBe('#2e3440');
    expect(loadDevicePrefs().themeId).toBe('nord');
    expect(localStorage.getItem(DEVICE_THEME_KEY)).toContain('nord');
  });

  it('a wall layout override and ?theme= win over the device', () => {
    localStorage.setItem(DEVICE_THEME_KEY, JSON.stringify({ version: 1, themeId: 'nord', favorites: [] }));
    setup({ layoutThemeId: 'oled-black' });
    expect(value('theme')).toBe('oled-black');
  });

  it('?theme= has the highest precedence', () => {
    setup({ layoutThemeId: 'oled-black', search: '?theme=dracula' });
    expect(value('theme')).toBe('dracula');
    expect(value('source')).toBe('url');
  });

  it('hover preview applies temporarily and restores', async () => {
    const target = setup();
    await userEvent.click(screen.getByText('preview dracula'));
    expect(target.dataset.theme).toBe('dracula');
    await userEvent.click(screen.getByText('end preview'));
    expect(target.dataset.theme).toBe('orbit-dark');
    expect(loadDevicePrefs().themeId).toBeNull();
  });

  it('custom themes can be selected', async () => {
    localStorage.setItem(DEVICE_THEME_KEY, JSON.stringify({ version: 1, themeId: 'noc-night', favorites: [] }));
    setup({ customThemes: [custom] });
    expect(value('theme')).toBe('noc-night');
  });

  it('favorites are stored per device', async () => {
    setup();
    await userEvent.click(screen.getByText('fav'));
    expect(value('favorites')).toBe('kanagawa');
    expect(loadDevicePrefs().favorites).toEqual(['kanagawa']);
    await userEvent.click(screen.getByText('fav'));
    expect(value('favorites')).toBe('');
  });

  it('restore default clears the device choice', async () => {
    setup();
    await userEvent.click(screen.getByText('device nord'));
    await userEvent.click(screen.getByText('restore default'));
    expect(value('theme')).toBe('orbit-dark');
  });

  it('cross-fades with animations on and switches instantly with animations off', async () => {
    const animated = setup();
    await userEvent.click(screen.getByText('device nord'));
    expect(animated.dataset.themeTransition).toBe('');
    document.body.innerHTML = '';
    localStorage.clear();
    const instant = setup({}, 'off');
    await act(async () => screen.getByText('device nord').click());
    expect(instant.dataset.themeTransition).toBeUndefined();
  });

  it('survives blocked storage', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('blocked');
    };
    try {
      setup();
      expect(value('theme')).toBe('orbit-dark');
    } finally {
      Storage.prototype.getItem = original;
    }
  });

  it('FE-50: a controlled device theme (device preferences) is applied and changes go to its owner', async () => {
    const onDeviceThemeChange = vi.fn();
    const target = setup({ deviceThemeId: 'kanagawa', onDeviceThemeChange, workspaceThemeId: 'nord' });
    expect(value('theme')).toBe('kanagawa');
    expect(value('source')).toBe('device');
    expect(target.dataset.theme).toBe('kanagawa');
    await userEvent.click(screen.getByText('device nord'));
    expect(onDeviceThemeChange).toHaveBeenCalledWith('nord');
    expect(loadDevicePrefs().themeId).toBeNull();
    await userEvent.click(screen.getByText('restore default'));
    expect(onDeviceThemeChange).toHaveBeenLastCalledWith(null);
  });

  it('FE-50: a controlled device theme of null falls back to the workspace default', () => {
    localStorage.setItem(DEVICE_THEME_KEY, JSON.stringify({ version: 1, themeId: 'dracula', favorites: [] }));
    setup({ deviceThemeId: null, onDeviceThemeChange: vi.fn(), workspaceThemeId: 'nord' });
    expect(value('theme')).toBe('nord');
  });
});
