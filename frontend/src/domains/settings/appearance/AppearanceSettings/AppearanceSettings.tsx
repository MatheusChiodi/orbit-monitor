import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SYSTEM_THEME, useTheme, type OrbitTheme } from '@/shared/theme';
import { Button } from '@/shared/ui';
import { ThemeEditor } from '../ThemeEditor';
import { ThemeGallery } from '../ThemeGallery';

export interface AppearanceSettingsProps {
  /** Persists to `orbit.themes.json` (create or update). */
  onSaveCustom: (theme: OrbitTheme) => void;
  onDeleteCustom: (id: string) => void;
  /** Writes `appearance.themeId` to `orbit.settings.json`; hidden when not provided. */
  onSetWorkspaceDefault?: (id: string) => void;
  /** LAN viewers (access policy): device choice only, no edits to shared files. */
  readOnly?: boolean;
}

/** Settings → Appearance: theme gallery (FE-03) and editor (FE-01). */
export function AppearanceSettings({ onSaveCustom, onDeleteCustom, onSetWorkspaceDefault, readOnly = false }: AppearanceSettingsProps) {
  const { t } = useTranslation();
  const { theme, deviceThemeId, setDeviceTheme } = useTheme();
  const [editing, setEditing] = useState<OrbitTheme | null>(null);

  if (editing) {
    return (
      <ThemeEditor
        theme={editing}
        readOnly={readOnly}
        onCancel={() => setEditing(null)}
        onSave={(saved) => {
          onSaveCustom(saved);
          setDeviceTheme(saved.id);
          setEditing(null);
        }}
      />
    );
  }

  const followsSystem = deviceThemeId === SYSTEM_THEME;
  return (
    <div className="flex flex-col gap-5">
      {readOnly ? <p className="rounded-[0.5rem] border border-line-2 bg-s2 px-3 py-2 text-[0.8rem] text-muted">{t('theme.gallery.readOnly')}</p> : null}
      <ThemeGallery
        readOnly={readOnly}
        onEdit={(next) => setEditing(next)}
        onSaveCustom={onSaveCustom}
        onDeleteCustom={(id) => {
          if (theme.id === id) setDeviceTheme(null);
          onDeleteCustom(id);
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <label className="flex items-center gap-2 text-[0.85rem] text-text">
          <input
            type="checkbox"
            checked={followsSystem}
            onChange={(e) => setDeviceTheme(e.currentTarget.checked ? SYSTEM_THEME : null)}
            className="size-[1rem] accent-[var(--accent)]"
          />
          {t('theme.gallery.followSystem')}
        </label>
        {onSetWorkspaceDefault && !readOnly ? (
          <Button variant="neutral" onClick={() => onSetWorkspaceDefault(theme.id)}>
            {t('theme.gallery.workspaceDefault')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
