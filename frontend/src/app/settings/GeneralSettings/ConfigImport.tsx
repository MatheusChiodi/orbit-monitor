import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Field, FilePicker, useToast } from '@/shared/ui';
import type { ConfigDiff } from '../configTransfer';
import type { SettingsApi } from './GeneralSettings';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** CORE-19 import: pick a zip, review the dry-run diff, then apply. Nothing is written before Apply. */
export function ConfigImport({ api }: { api: Pick<SettingsApi, 'previewImport' | 'applyImport'> }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [archive, setArchive] = useState<File | null>(null);
  const [diff, setDiff] = useState<ConfigDiff[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  // Remounting the picker clears the chosen file name after Apply or Cancel.
  const [pickerKey, setPickerKey] = useState(0);

  const clear = () => {
    setArchive(null);
    setDiff(null);
    setPickerKey((k) => k + 1);
  };

  async function onFile(file: File | null) {
    setError(null);
    setDiff(null);
    setArchive(file);
    if (!file) return;
    try {
      setDiff(await api.previewImport(file));
    } catch (e) {
      setError(message(e));
    }
  }

  async function onApply() {
    if (!archive) return;
    setApplying(true);
    try {
      await api.applyImport(archive);
      toast({ title: t('settingsHub.general.imported'), tone: 'OK' });
      clear();
    } catch (e) {
      setError(message(e));
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-3">
      <Field label={t('settingsHub.general.import')} hint={t('settingsHub.general.importHint')} error={error ?? undefined}>
        <FilePicker key={pickerKey} accept="application/zip,.zip" onFile={(file) => void onFile(file)} />
      </Field>
      {diff && diff.length === 0 && (
        <p role="status" className="m-0 text-sm text-muted">
          {t('settingsHub.general.noChanges')}
        </p>
      )}
      {diff && diff.length > 0 && archive && (
        <section aria-label={t('settingsHub.general.review')} className="flex flex-col gap-3 rounded-md border border-line bg-s2 p-3">
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
            {diff.map((d) => (
              <li key={d.file} className="flex flex-wrap gap-x-3">
                <span className="font-mono">{d.file}</span>
                <span className="text-muted">
                  {t('settings.importSummary', { added: d.added.length, changed: d.changed.length, removed: d.removed.length })}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" loading={applying} onClick={() => void onApply()}>
              {t('settingsHub.general.applyImport')}
            </Button>
            <Button variant="ghost" onClick={clear}>
              {t('settingsHub.general.cancelImport')}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
