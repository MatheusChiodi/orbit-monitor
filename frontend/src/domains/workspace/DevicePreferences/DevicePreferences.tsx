import { useId, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { translate, type Message } from '@/shared/i18n/message';
import { exportPreferences, parsePreferencesFile, type PreferencesStore } from '@/shared/preferences/preferences';
import { VIEWING_DISTANCES, isViewingDistance } from '@/shared/preferences/viewingDistance';
import { Button, Card, Field, IconDownload, IconUpload, Select } from '@/shared/ui';

export interface DevicePreferencesProps {
  store: PreferencesStore;
}

const FILE_NAME = 'orbit-preferences.json';

function download(text: string): void {
  if (typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = FILE_NAME;
  link.click();
  URL.revokeObjectURL(url);
}

async function readText(file: File): Promise<string> {
  return typeof file.text === 'function' ? file.text() : new Response(file).text();
}

/**
 * FE-50 in Settings › Advanced: the viewing distance (explained) and the device preferences file.
 * Theme, density and animation live in Appearance; the language in General.
 */
export function DevicePreferences({ store }: DevicePreferencesProps) {
  const { t } = useTranslation();
  const importId = useId();
  const input = useRef<HTMLInputElement>(null);
  const device = useStore(store, (s) => s.device);
  const scale = useStore(store, (s) => s.effective.scale);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<Message | null>(null);

  async function onImport(event: ChangeEvent<HTMLInputElement>) {
    const target = event.currentTarget;
    const file = target.files?.[0];
    if (!file) return;
    const result = parsePreferencesFile(await readText(file));
    target.value = '';
    if (result.ok) {
      store.getState().replace(result.preferences);
      setError(null);
      setNotice(t('preferences.imported'));
    } else {
      setNotice(null);
      setError(result.error);
    }
  }

  return (
    <Card title={t('settingsHub.advanced.device')} description={t('settingsHub.advanced.deviceHint')}>
      <Field label={t('settingsHub.advanced.viewingDistance')} hint={t('settingsHub.advanced.viewingDistanceHint')} className="max-w-md">
        <Select
          value={scale}
          onChange={(e) => {
            if (isViewingDistance(e.target.value)) store.getState().set('scale', e.target.value);
          }}
        >
          {VIEWING_DISTANCES.map((distance) => (
            <option key={distance} value={distance}>
              {t(`preferences.scales.${distance}`)}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <Button size="sm" onClick={() => download(exportPreferences(device))}>
          <IconDownload />
          {t('settingsHub.advanced.exportDevice')}
        </Button>
        <input
          ref={input}
          id={importId}
          type="file"
          accept="application/json,.json"
          aria-label={t('settingsHub.advanced.importDevice')}
          tabIndex={-1}
          className="sr-only"
          onChange={(event) => void onImport(event)}
        />
        <Button size="sm" onClick={() => input.current?.click()}>
          <IconUpload />
          {t('settingsHub.advanced.importDevice')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            store.getState().reset();
            setNotice(null);
            setError(null);
          }}
        >
          {t('settingsHub.advanced.resetDevice')}
        </Button>
      </div>

      {notice && (
        <p role="status" className="m-0 text-sm text-ok-text">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="m-0 text-sm text-down-text">
          {translate(t, error)}
        </p>
      )}
    </Card>
  );
}
