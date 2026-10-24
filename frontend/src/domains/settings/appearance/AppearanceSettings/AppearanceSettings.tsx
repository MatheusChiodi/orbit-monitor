import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Preferences, PreferencesStore } from '@/shared/preferences/preferences';
import { SYSTEM_THEME, useTheme, type OrbitTheme } from '@/shared/theme';
import { Button, Card, StickyActionBar, Switch } from '@/shared/ui';
import { DisplayControls } from '../DisplayControls';
import { ThemeEditor } from '../ThemeEditor';
import { ThemeGallery } from '../ThemeGallery';
import { themeLabel } from '../themeLabel';

/** What "Make workspace default" saves besides the theme (when the device preferences are known). */
export type DisplayDefaults = Partial<Pick<Preferences, 'density' | 'animation'>>;

export interface AppearanceSettingsProps {
  /** Persists to `orbit.themes.json` (create or update). */
  onSaveCustom: (theme: OrbitTheme) => void;
  onDeleteCustom: (id: string) => void;
  /** Saves the workspace default theme (and density/animation); hidden when not provided. */
  onSetWorkspaceDefault?: (themeId: string, display: DisplayDefaults) => void;
  /** Device preferences: density, text size and animation are shown when given. */
  preferences?: PreferencesStore;
  /** LAN viewers (access policy): device choice only, no edits to shared files. */
  readOnly?: boolean;
}

/**
 * FE-72 Settings › Appearance: theme gallery (FE-03) with a preview-then-apply footer, the display controls
 * (density, text size, animation) and the theme editor (FE-01).
 */
export function AppearanceSettings({ onSaveCustom, onDeleteCustom, onSetWorkspaceDefault, preferences, readOnly = false }: AppearanceSettingsProps) {
  const { t } = useTranslation();
  const { theme, themes, deviceThemeId, setDeviceTheme, preview } = useTheme();
  const [editing, setEditing] = useState<OrbitTheme | null>(null);
  // The page owns the only preview, so on mount the effective theme is the applied one.
  const [applied, setApplied] = useState(theme.id);
  const [selectedId, setSelectedId] = useState(applied);
  const selected = themes.find((x) => x.id === selectedId) ?? theme;
  const pending = selectedId !== applied;

  // Leaving the page never keeps a preview that was not applied.
  useEffect(() => () => preview(null), [preview]);

  if (editing) {
    return (
      <ThemeEditor
        theme={editing}
        readOnly={readOnly}
        onCancel={() => setEditing(null)}
        onSave={(saved) => {
          onSaveCustom(saved);
          setDeviceTheme(saved.id);
          setApplied(saved.id);
          setSelectedId(saved.id);
          setEditing(null);
        }}
      />
    );
  }

  const select = (id: string) => {
    setSelectedId(id);
    preview(id === applied ? null : id);
  };
  const useOnDevice = () => {
    setDeviceTheme(selectedId);
    preview(null);
    setApplied(selectedId);
  };
  const followsSystem = deviceThemeId === SYSTEM_THEME;
  const name = themeLabel(t, selected);

  return (
    <div className="flex flex-col gap-4">
      {readOnly && <p className="m-0 rounded-sm border border-line-2 bg-s2 px-3 py-2 text-sm text-muted">{t('theme.gallery.readOnly')}</p>}
      <Card>
        <ThemeGallery
          selectedId={selectedId}
          appliedId={applied}
          readOnly={readOnly}
          onSelect={select}
          onEdit={(next) => setEditing(next)}
          onSaveCustom={onSaveCustom}
          onDeleteCustom={(id) => {
            if (applied === id) {
              setDeviceTheme(null);
              setApplied(theme.id);
            }
            onDeleteCustom(id);
          }}
        />
        <Switch
          label={t('settingsHub.appearance.followSystem')}
          checked={followsSystem}
          onCheckedChange={(on) => setDeviceTheme(on ? SYSTEM_THEME : null)}
          className="border-t border-line pt-3"
        />
      </Card>

      {preferences && <DisplayCard preferences={preferences} />}

      <StickyActionBar
        status={
          <span aria-live="polite">
            {pending ? t('settingsHub.appearance.previewing', { name }) : t('settingsHub.appearance.inUse', { name })}
          </span>
        }
      >
        {onSetWorkspaceDefault && !readOnly && (
          <Button
            title={t('settingsHub.appearance.defaultHint')}
            onClick={() => onSetWorkspaceDefault(selectedId, preferences ? pickDisplay(preferences) : {})}
          >
            {t('settingsHub.appearance.makeDefault')}
          </Button>
        )}
        <Button variant="primary" disabled={!pending} onClick={useOnDevice}>
          {t('settingsHub.appearance.useOnDevice')}
        </Button>
      </StickyActionBar>
    </div>
  );
}

function pickDisplay(preferences: PreferencesStore): DisplayDefaults {
  const { density, animation } = preferences.getState().effective;
  return { density, animation };
}

function DisplayCard({ preferences }: { preferences: PreferencesStore }) {
  const { t } = useTranslation();
  return (
    <Card title={t('settingsHub.appearance.display')} description={t('settingsHub.appearance.displayHint')}>
      <DisplayControls preferences={preferences} />
    </Card>
  );
}
