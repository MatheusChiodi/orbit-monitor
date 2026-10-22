import { useId, useState, type ChangeEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { normalizeOperatorName } from '@/domains/security/operator/operator';
import { SUPPORTED_LOCALES } from '@/shared/i18n/i18n';
import { translate, type Message } from '@/shared/i18n/message';
import { ANIMATION_LEVELS, systemPrefersReducedMotion } from '@/shared/motion/animationLevel';
import { DENSITIES } from '@/shared/preferences/density';
import {
  exportPreferences,
  parsePreferencesFile,
  type PreferenceKey,
  type Preferences,
  type PreferencesStore,
} from '@/shared/preferences/preferences';
import { VIEWING_DISTANCES } from '@/shared/preferences/viewingDistance';
import { BUILT_IN_THEMES } from '@/shared/theme/registry';
import { Button, INPUT_CLASS, Panel, SELECT_CLASS } from '@/shared/ui';

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

interface FieldProps {
  label: string;
  fromWorkspace: boolean;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

/** Label above the control; the "workspace default" marker stays outside the label text. */
function Field({ label, fromWorkspace, children }: FieldProps) {
  const { t } = useTranslation();
  const id = useId();
  const markerId = `${id}-default`;
  return (
    <div className="flex flex-col gap-[0.3rem]">
      <div className="flex items-baseline justify-between gap-[0.5rem] text-[0.8rem]">
        <label htmlFor={id} className="text-muted">
          {label}
        </label>
        {fromWorkspace && (
          <span id={markerId} className="text-[0.72rem] text-dim">
            {t('preferences.workspaceDefault')}
          </span>
        )}
      </div>
      {children(id, fromWorkspace ? markerId : undefined)}
    </div>
  );
}

/** FE-50: theme, animation level, density, language, viewing distance and operator name for this device. */
export function DevicePreferences({ store }: DevicePreferencesProps) {
  const { t } = useTranslation();
  const device = useStore(store, (s) => s.device);
  const effective = useStore(store, (s) => s.effective);
  const set = useStore(store, (s) => s.set);
  const replace = useStore(store, (s) => s.replace);
  const reset = useStore(store, (s) => s.reset);
  const [reducedMotion] = useState(systemPrefersReducedMotion);
  const [operatorDraft, setOperatorDraft] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<Message | null>(null);

  const fromWorkspace = (key: PreferenceKey) => device[key] === undefined;
  const onSelect =
    <K extends PreferenceKey>(key: K) =>
    (event: ChangeEvent<HTMLSelectElement>) => {
      set(key, event.target.value as Preferences[K]);
      setNotice(null);
    };

  const themes = BUILT_IN_THEMES.some((theme) => theme.id === effective.theme)
    ? BUILT_IN_THEMES.map((theme) => ({ id: theme.id, name: theme.name }))
    : [{ id: effective.theme, name: effective.theme }, ...BUILT_IN_THEMES.map((theme) => ({ id: theme.id, name: theme.name }))];

  const commitOperator = () => {
    if (operatorDraft === null) return;
    set('operatorName', normalizeOperatorName(operatorDraft));
    setOperatorDraft(null);
  };

  async function onImport(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const result = parsePreferencesFile(await readText(file));
    input.value = '';
    if (result.ok) {
      replace(result.preferences);
      setError(null);
      setNotice(t('preferences.imported'));
    } else {
      setNotice(null);
      setError(result.error);
    }
  }

  return (
    <Panel surface="solid" className="gap-[1rem]">
      <p className="m-0 text-[0.88rem] text-muted">{t('preferences.hint')}</p>

      <div className="grid gap-[1rem] sm:grid-cols-2">
        <Field label={t('preferences.theme')} fromWorkspace={fromWorkspace('theme')}>
          {(id, describedBy) => (
            <select id={id} aria-describedby={describedBy} className={SELECT_CLASS} value={effective.theme} onChange={onSelect('theme')}>
              {themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label={t('preferences.animation')} fromWorkspace={fromWorkspace('animation')}>
          {(id, describedBy) => (
            <>
              <select id={id} aria-describedby={describedBy} className={SELECT_CLASS} value={effective.animation} onChange={onSelect('animation')}>
                {ANIMATION_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {t(`preferences.animationLevels.${level}`)}
                  </option>
                ))}
              </select>
              {reducedMotion && <p className="m-0 text-[0.78rem] text-warn-text">{t('preferences.reducedMotion')}</p>}
            </>
          )}
        </Field>

        <Field label={t('preferences.density')} fromWorkspace={fromWorkspace('density')}>
          {(id, describedBy) => (
            <select id={id} aria-describedby={describedBy} className={SELECT_CLASS} value={effective.density} onChange={onSelect('density')}>
              {DENSITIES.map((density) => (
                <option key={density} value={density}>
                  {t(`preferences.densities.${density}`)}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label={t('preferences.language')} fromWorkspace={fromWorkspace('locale')}>
          {(id, describedBy) => (
            <select id={id} aria-describedby={describedBy} className={SELECT_CLASS} value={effective.locale} onChange={onSelect('locale')}>
              {SUPPORTED_LOCALES.map((locale) => (
                <option key={locale} value={locale}>
                  {t(`app.languages.${locale}`)}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label={t('preferences.scale')} fromWorkspace={fromWorkspace('scale')}>
          {(id, describedBy) => (
            <select id={id} aria-describedby={describedBy} className={SELECT_CLASS} value={effective.scale} onChange={onSelect('scale')}>
              {VIEWING_DISTANCES.map((distance) => (
                <option key={distance} value={distance}>
                  {t(`preferences.scales.${distance}`)}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label={t('preferences.operatorName')} fromWorkspace={false}>
          {(id) => (
            <input
              id={id}
              type="text"
              maxLength={60}
              autoComplete="name"
              className={INPUT_CLASS}
              value={operatorDraft ?? effective.operatorName ?? ''}
              onChange={(event) => setOperatorDraft(event.target.value)}
              onBlur={commitOperator}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitOperator();
              }}
            />
          )}
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-[0.6rem]">
        <Button onClick={() => download(exportPreferences(device))}>{t('preferences.export')}</Button>
        <label className="inline-flex h-[2.2rem] cursor-pointer items-center rounded-[0.45rem] border border-line-2 bg-s3 px-[0.9rem] text-[0.85rem] font-semibold text-text hover:bg-s2 focus-within:outline-2 focus-within:outline-info">
          {t('preferences.import')}
          <input type="file" accept="application/json,.json" className="sr-only" onChange={(event) => void onImport(event)} />
        </label>
        <Button
          variant="ghost"
          onClick={() => {
            reset();
            setOperatorDraft(null);
            setNotice(null);
            setError(null);
          }}
        >
          {t('preferences.reset')}
        </Button>
      </div>

      {notice && (
        <p role="status" className="m-0 text-[0.85rem] text-ok-text">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="m-0 text-[0.85rem] text-down-text">
          {translate(t, error)}
        </p>
      )}
    </Panel>
  );
}
