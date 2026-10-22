import { useCallback, type ReactNode } from 'react';
import { useStore } from 'zustand';
import type { PreferencesStore } from '@/shared/preferences/preferences';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { useCustomThemes, type ThemesClient } from '@/shared/theme/customThemes';

export interface ConsoleThemeProps {
  preferences: PreferencesStore;
  themesClient: ThemesClient;
  children: ReactNode;
}

/**
 * FE-03 / FE-50: the console theme. The device choice lives in the device preferences (`orbit.preferences`),
 * the workspace default comes from BE-40 and custom themes from `/api/themes`; `?theme=` still wins.
 */
export function ConsoleTheme({ preferences, themesClient, children }: ConsoleThemeProps) {
  const device = useStore(preferences, (s) => s.device.theme ?? null);
  const workspace = useStore(preferences, (s) => s.defaults.theme ?? null);
  const { themes } = useCustomThemes(themesClient);
  const onDeviceThemeChange = useCallback(
    (id: string | null) => {
      const state = preferences.getState();
      if (id) state.set('theme', id);
      else state.replace({ ...state.device, theme: undefined });
    },
    [preferences],
  );
  return (
    <ThemeProvider customThemes={themes} deviceThemeId={device} onDeviceThemeChange={onDeviceThemeChange} workspaceThemeId={workspace}>
      {children}
    </ThemeProvider>
  );
}
