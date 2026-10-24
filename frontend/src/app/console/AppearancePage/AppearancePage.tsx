import { useState } from 'react';
import { AppearanceSettings, type DisplayDefaults } from '@/domains/settings/appearance/AppearanceSettings';
import type { PreferencesStore } from '@/shared/preferences/preferences';
import { useCustomThemes, type ThemesClient } from '@/shared/theme/customThemes';

export const APPEARANCE_HASH = '#/settings/appearance';

export interface AppearancePageProps {
  themesClient: ThemesClient;
  editable: boolean;
  /** BE-40: saves the workspace default theme, density and animation (editors only). */
  onSetWorkspaceDefault: (themeId: string, display: DisplayDefaults) => void;
  /** Device preferences for the density, text size and animation controls. */
  preferences?: PreferencesStore;
}

/**
 * Settings → Appearance: gallery, editor, import/export (FE-01/03/04); custom themes persist through
 * `/api/themes`. Server errors (e.g. 422 when the BE-40 contrast check fails) are shown as they come.
 */
export function AppearancePage({ themesClient, editable, onSetWorkspaceDefault, preferences }: AppearancePageProps) {
  const { save, remove } = useCustomThemes(themesClient);
  const [error, setError] = useState<string | null>(null);
  const run = (task: Promise<void>) => {
    setError(null);
    task.catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  };
  return (
    <>
      {error && (
        <p role="alert" className="m-0 text-sm text-down-text">
          {error}
        </p>
      )}
      <AppearanceSettings
        readOnly={!editable}
        preferences={preferences}
        onSaveCustom={(theme) => run(save(theme))}
        onDeleteCustom={(id) => run(remove(id))}
        onSetWorkspaceDefault={editable ? onSetWorkspaceDefault : undefined}
      />
    </>
  );
}
