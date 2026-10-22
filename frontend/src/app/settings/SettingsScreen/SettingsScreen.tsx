import { useEffect, useId, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { canEdit } from '@/domains/security/access';
import type { OperatorStore } from '@/domains/security/operator';
import { ViewOnlyBanner } from '@/domains/security/ViewOnlyBanner';
import type { ConfigFile, ConfigItem } from '@/shared/api/configResources';
import type { AccessInfo } from '@/shared/api/types';
import { SUPPORTED_LOCALES, isLocale, type Locale } from '@/shared/i18n/i18n';
import { Button, INPUT_CLASS, LABEL_CLASS, Panel, SELECT_CLASS } from '@/shared/ui';
import { exportFileName, type ConfigDiff } from '../configTransfer';

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

export interface SettingsScreenProps {
  api: SettingsApi;
  operatorStore: OperatorStore;
}

const STATE_KEY = { ok: 'settings.fileOk', missing: 'settings.fileMissing', invalid: 'settings.fileInvalid' } as const;

function download(blob: Blob, name: string): void {
  if (typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}


/** Settings: access mode, operator name, workspace defaults and config files (nothing kept in the browser). */
export function SettingsScreen({ api, operatorStore }: SettingsScreenProps) {
  const { t } = useTranslation();
  const ids = { operator: useId(), language: useId(), import: useId() };
  const operator = useStore(operatorStore, (s) => s.name);
  const setOperator = useStore(operatorStore, (s) => s.setName);
  const [operatorDraft, setOperatorDraft] = useState(operator ?? '');
  const [access, setAccess] = useState<AccessInfo | null>(null);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [health, setHealth] = useState<ConfigFileHealth[]>([]);
  const [archive, setArchive] = useState<Blob | null>(null);
  const [diff, setDiff] = useState<ConfigDiff[] | null>(null);
  const [imported, setImported] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

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

  if (!access || !settings) return <p className="text-muted">{t('app.loading')}</p>;
  const editable = canEdit(access.mode);

  async function onImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImported(false);
    setImportError(null);
    try {
      setDiff(await api.previewImport(file));
      setArchive(file);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onApply() {
    if (!archive) return;
    try {
      await api.applyImport(archive);
      setImported(true);
      setDiff(null);
      setArchive(null);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="flex flex-col gap-[1rem]">
      <h1 className="m-0 font-display text-[1.6rem] font-bold tracking-tight">{t('settings.title')}</h1>
      {editable ? (
        <p className="m-0 text-[0.85rem] text-ok-text">{t('settings.editMode')}</p>
      ) : (
        <ViewOnlyBanner mode={access.mode} />
      )}

      <Panel>
        <div className={LABEL_CLASS}>
          <label htmlFor={ids.operator}>{t('operator.label')}</label>
          <input
            id={ids.operator}
            className={INPUT_CLASS}
            value={operatorDraft}
            onChange={(e) => setOperatorDraft(e.target.value)}
            onBlur={() => setOperator(operatorDraft)}
          />
          <span className="text-[0.75rem] text-dim">{t('operator.hint')}</span>
        </div>
      </Panel>

      <Panel title={t('settings.defaults')}>
        <div className="flex flex-wrap items-end gap-[0.8rem]">
          <div className={LABEL_CLASS}>
            <label htmlFor={ids.language}>{t('settings.defaultLanguage')}</label>
            <select
              id={ids.language}
              className={SELECT_CLASS}
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
            </select>
          </div>
          {editable && (
            <Button variant="primary" onClick={() => void api.saveSettings(settings)}>
              {t('settings.saveDefaults')}
            </Button>
          )}
        </div>
      </Panel>

      <Panel title={t('settings.files')}>
        <table aria-label={t('settings.files')} className="w-full border-collapse text-[0.85rem]">
          <thead className="sr-only">
            <tr>
              <th>{t('settings.files')}</th>
              <th>{t('console.monitors.columns.state')}</th>
              <th>#</th>
            </tr>
          </thead>
          <tbody>
            {health.map((f) => (
              <tr key={f.file} className="border-b border-line last:border-0">
                <td className="py-[0.4rem] font-mono">{f.file}</td>
                <td className={`py-[0.4rem] ${f.state === 'invalid' ? 'text-down-text' : f.state === 'ok' ? 'text-ok-text' : 'text-muted'}`}>
                  {t(STATE_KEY[f.state])}
                  {f.error && <span className="ml-[0.5rem] font-mono text-[0.78rem]">{f.error}</span>}
                </td>
                <td className="py-[0.4rem] text-right font-mono">{f.items}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-[0.8rem] flex flex-wrap items-center gap-[0.8rem]">
          <Button onClick={() => void api.exportConfig().then((blob) => download(blob, exportFileName()))}>{t('settings.export')}</Button>
          <span className="text-[0.78rem] text-muted">{t('settings.exportNote')}</span>
          {editable && (
            <span className={LABEL_CLASS}>
              <label htmlFor={ids.import}>{t('settings.import')}</label>
              <input id={ids.import} type="file" accept="application/zip,.zip" onChange={(e) => void onImport(e)} />
            </span>
          )}
        </div>
      </Panel>

      {imported && <p role="status" className="m-0 text-ok-text">{t('screens.settings.imported')}</p>}
      {importError && <p role="alert" className="m-0 text-down-text">{importError}</p>}
      {diff && diff.length === 0 && <p role="status" className="m-0 text-muted">{t('screens.settings.noChanges')}</p>}
      {diff && diff.length > 0 && archive && (
        <Panel title={t('settings.importPreview')}>
          <ul className="m-0 flex list-none flex-col gap-[0.3rem] p-0 text-[0.85rem]">
            {diff.map((d) => (
              <li key={d.file} className="flex gap-[0.8rem]">
                <span className="font-mono">{d.file}</span>
                <span className="text-muted">
                  {t('settings.importSummary', { added: d.added.length, changed: d.changed.length, removed: d.removed.length })}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-[0.8rem]">
            <Button variant="primary" onClick={() => void onApply()}>
              {t('settings.applyImport')}
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
