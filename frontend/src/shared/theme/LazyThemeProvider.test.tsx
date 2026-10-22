import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LazyThemeProvider, useAppliedTheme } from './LazyThemeProvider';
import { loadBuiltInTheme } from './lazyThemes';
import { ORBIT_DARK } from './registry';
import type { OrbitTheme } from './types';

const custom: OrbitTheme = { ...ORBIT_DARK, id: 'noc-night', name: 'NOC night', category: 'custom', colors: { ...ORBIT_DARK.colors, bg: '#010203' } };

function Probe() {
  const applied = useAppliedTheme();
  return (
    <output aria-label="applied">
      {applied.id}:{applied.source}
    </output>
  );
}

function setup(props: Partial<Parameters<typeof LazyThemeProvider>[0]> = {}) {
  const target = document.createElement('div');
  render(
    <LazyThemeProvider target={target} search="" animate={false} {...props}>
      <Probe />
    </LazyThemeProvider>,
  );
  return target;
}

function stubColorScheme(dark: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (media: string) =>
      ({
        matches: media.includes('dark') ? dark : false,
        media,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('FE-05 lazy theme scope for the wall', () => {
  it('loads one built-in theme on demand', async () => {
    const theme = await loadBuiltInTheme('nord');
    expect(theme?.id).toBe('nord');
    expect(await loadBuiltInTheme('not-a-theme')).toBeNull();
  });

  it('`?theme=` beats the layout, device and workspace levels', async () => {
    const target = setup({ search: '?theme=dracula', layoutThemeId: 'nord', deviceThemeId: 'kanagawa', workspaceThemeId: 'one-dark' });
    await waitFor(() => expect(target.dataset.theme).toBe('dracula'));
    expect(screen.getByLabelText('applied')).toHaveTextContent('dracula:url');
    expect(target.style.getPropertyValue('--bg')).not.toBe('');
  });

  it('the layout theme beats the device choice, which beats the workspace default', async () => {
    const target = setup({ layoutThemeId: 'nord', deviceThemeId: 'kanagawa', workspaceThemeId: 'one-dark' });
    await waitFor(() => expect(target.dataset.theme).toBe('nord'));

    const device = setup({ deviceThemeId: 'kanagawa', workspaceThemeId: 'one-dark' });
    await waitFor(() => expect(device.dataset.theme).toBe('kanagawa'));

    const workspace = setup({ workspaceThemeId: 'one-dark' });
    await waitFor(() => expect(workspace.dataset.theme).toBe('one-dark'));
  });

  it('unknown ids fall through to the next level', async () => {
    const target = setup({ search: '?theme=missing', layoutThemeId: 'also-missing', deviceThemeId: 'nord' });
    await waitFor(() => expect(target.dataset.theme).toBe('nord'));
    expect(screen.getByLabelText('applied')).toHaveTextContent('nord:device');
  });

  it('applies custom themes from orbit.themes.json', async () => {
    const target = setup({ layoutThemeId: 'noc-night', customThemes: [custom] });
    await waitFor(() => expect(target.dataset.theme).toBe('noc-night'));
    expect(target.style.getPropertyValue('--bg')).toBe('#010203');
  });

  it('`system` follows prefers-color-scheme with the light/dark pair', async () => {
    stubColorScheme(false);
    const light = setup({ deviceThemeId: 'system' });
    await waitFor(() => expect(light.dataset.theme).toBe('github-light'));
  });

  it('falls back to Orbit Dark without any choice', async () => {
    const target = setup();
    await waitFor(() => expect(target.dataset.theme).toBe('orbit-dark'));
    expect(screen.getByLabelText('applied')).toHaveTextContent('orbit-dark:default');
  });
});
