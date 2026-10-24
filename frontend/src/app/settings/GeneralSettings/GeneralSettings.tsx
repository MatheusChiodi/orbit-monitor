import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { canEdit } from '@/domains/security/access';
import type { ConfigFile, ConfigItem } from '@/shared/api/configResources';
import type { AccessInfo } from '@/shared/api/types';
import { SUPPORTED_LOCALES, currentLocale, isLocale, setLocale, type Locale } from '@/shared/i18n/i18n';
import type { PreferencesStore } from '@/shared/preferences/preferences';
import { Button, Card, Field, IconDownload, Select, useToast } from '@/shared/ui';
import { exportFileName, type ConfigDiff } from '../configTransfer';
import { ConfigImport } from './ConfigImport';

/** `orbit.settings.json` item with the workspace defaults. */
export interface WorkspaceSettings extends ConfigItem {
  defaultLocale?: Locale;
  theme?: string;
  animationLevel?: string;
  density?: string;
  historyHours?: number;
}

export interface ConfigFileHealth {
  file: string;
  state: 'ok' | 'missing' | 'invalid';
  items: number;
  error?: string;
}

export interface SettingsApi {
  getAccess: () => Promise<AccessInfo>;
  getSettings: () => Promise<ConfigFile<WorkspaceSettings>>;
  saveSettings: (settings: WorkspaceSettings) => Promise<void>;
  getConfigHealth: () => Promise<ConfigFileHealth[]>;
  /** Zip of every `orbit.<feature>.json` file, secrets omitted by the backend (BE-37). */
  exportConfig: () => Promise<Blob>;
  /** `POST /api/config/import?dryRun=true` with the zip: per-file diff, nothing written. */
  previewImport: (archive: Blob) => Promise<ConfigDiff[]>;
  /** `POST /api/config/import?dryRun=false`. */
  applyImport: (archive: Blob) => Promise<void>;
}

export interface GeneralSettingsProps {
  api: SettingsApi;
  /** Device preferences: the language choice goes through them so the console follows it. */
  preferences?: PreferencesStore;
}

const STATE_KEY = { ok: 'settings.fileOk', missing: 'settings.fileMissing', invalid: 'settings.fileInvalid' } as const;
const STATE_TONE = { ok: 'text-ok-text', missing: 'text-muted', invalid: 'text-down-text' } as const;

function download(blob: Blob, name: string): void {
  if (typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** FE-72 Settings › General: device language, access, workspace language default and config files (CORE-19). */
export function GeneralSettings({ api, preferences }: GeneralSettingsProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const ids = { language: useId(), defaultLanguage: useId() };
  const [access, setAccess] = useState<AccessInfo | null>(null);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [health, setHealth] = useState<ConfigFileHealth[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void Promise.all([api.getAccess(), api.getSettings()]).then(([a, s]) => {
      if (!alive) return;
      setAccess(a);
      setSettings(s.items[0] ?? { id: 'workspace' });
    });
    // Health is informative only: a backend without it still shows the rest of the screen.
    api.getConfigHealth().then(
      (h) => alive && setHealth(h),
      () => alive && setHealth([]),
    );
    return () => {
      alive = false;
    };
  }, [api]);

  if (!access || !settings) return <p className="m-0 text-muted">{t('app.loading')}</p>;
  const editable = canEdit(access.mode);

  const onLanguage = (value: string) => {
    if (!isLocale(value)) return;
    if (preferences) preferences.getState().set('locale', value);
    else void setLocale(i18n, value);
  };

  async function saveDefaults(next: WorkspaceSettings) {
    setSaving(true);
    try {
      await api.saveSettings(next);
      toast({ title: t('settingsHub.general.defaultsSaved'), tone: 'OK' });
    } catch (e) {
      toast({ title: t('settingsHub.general.saveFailed', { message: message(e) }), tone: 'DOWN' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title={t('settingsHub.general.language')} description={t('settingsHub.general.languageHint')}>
        <Field label={t('settingsHub.general.deviceLanguage')} id={ids.language} className="max-w-xs">
          <Select value={currentLocale(i18n)} onChange={(e) => onLanguage(e.target.value)}>
            {SUPPORTED_LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {t(`app.languages.${locale}`)}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <Card title={t('settingsHub.general.access')}>
        <p role="status" className={`m-0 text-base ${editable ? 'text-text' : 'text-muted'}`}>
          {editable ? t('settingsHub.general.editMode') : t('access.viewOnly')}
        </p>
        {!editable && <p className="m-0 text-sm text-muted">{t('settingsHub.general.viewOnlyHint')}</p>}
      </Card>

      <Card title={t('settingsHub.general.defaults')} description={t('settingsHub.general.defaultsHint')}>
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t('settingsHub.general.defaultLanguage')} id={ids.defaultLanguage} className="w-full max-w-xs">
            <Select
              disabled={!editable}
              value={settings.defaultLocale ?? 'en'}
              onChange={(e) => {
                if (isLocale(e.target.value)) setSettings({ ...settings, defaultLocale: e.target.value });
              }}
            >
              {SUPPORTED_LOCALES.map((locale) => (
                <option key={locale} value={locale}>
                  {t(`app.languages.${locale}`)}
                </option>
              ))}
            </Select>
          </Field>
          {editable && (
            <Button loading={saving} onClick={() => void saveDefaults(settings)}>
              {t('settingsHub.general.saveDefaults')}
            </Button>
          )}
        </div>
      </Card>

      <Card
        title={t('settingsHub.general.config')}
        description={t('settingsHub.general.configHint')}
        actions={
          <Button size="sm" onClick={() => void api.exportConfig().then((blob) => download(blob, exportFileName()))}>
            <IconDownload />
            {t('settingsHub.general.export')}
          </Button>
        }
      >
        <p className="m-0 text-sm text-muted">{t('settingsHub.general.exportHint')}</p>
        {health.length === 0 ? (
          <p className="m-0 text-sm text-dim">{t('settingsHub.general.noFiles')}</p>
        ) : (
          <table aria-label={t('settingsHub.general.config')} className="w-full border-collapse text-sm">
            <thead className="sr-only">
              <tr>
                <th>{t('settingsHub.general.file')}</th>
                <th>{t('settingsHub.general.state')}</th>
                <th>{t('settingsHub.general.items')}</th>
              </tr>
            </thead>
            <tbody>
              {health.map((f) => (
                <tr key={f.file} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3 font-mono break-all">{f.file}</td>
                  <td className={`py-2 pr-3 ${STATE_TONE[f.state]}`}>
                    {t(STATE_KEY[f.state])}
                    {f.error && <span className="ml-2 font-mono text-xs">{f.error}</span>}
                  </td>
                  <td className="py-2 text-right font-mono">{f.items}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {editable && <ConfigImport api={api} />}
      </Card>
    </div>
  );
}
