import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { LABEL_MAX_LENGTH } from '@/shared/customization/api';
import { catalogEntries, type TerminologyStore } from '@/shared/customization/terminology';
import { SUPPORTED_LOCALES, isLocale, type Locale } from '@/shared/i18n/i18n';
import { Button, INPUT_CLASS, LABEL_CLASS, SELECT_CLASS } from '@/shared/ui';

export interface TerminologyEditorProps {
  store: TerminologyStore;
  editable: boolean;
  /** Restricts the list to these keys (Names tab of the Customize inspector). */
  keys?: readonly string[];
}

const MAX_ROWS = 200;

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/** FE-54: rename any label per language, with search, reset and save to `orbit.terminology.json`. */
export function TerminologyEditor({ store, editable, keys }: TerminologyEditorProps) {
  const { t, i18n } = useTranslation();
  const ids = { language: useId() };
  const saved = useStore(store, (s) => s.labels);
  const error = useStore(store, (s) => s.error);
  const [locale, setLocale] = useState<Locale>(isLocale(i18n.language) ? i18n.language : 'en');
  const [drafts, setDrafts] = useState<Partial<Record<Locale, Record<string, string>>>>({});
  const [query, setQuery] = useState('');
  const [renamedOnly, setRenamedOnly] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const draft = drafts[locale] ?? saved[locale];
  const entries = useMemo(() => {
    const all = catalogEntries(locale);
    return keys ? all.filter((e) => keys.includes(e.key)) : all;
  }, [locale, keys]);
  const needle = normalize(query.trim());
  const visible = entries.filter(
    (e) => (!renamedOnly || e.key in draft) && (!needle || normalize(`${e.key} ${e.text} ${draft[e.key] ?? ''}`).includes(needle)),
  );
  const invalid = Object.entries(draft).filter(([, v]) => v.trim().length === 0 || v.length > LABEL_MAX_LENGTH);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved[locale]);

  const update = (next: Record<string, string>) => {
    setNotice(null);
    setDrafts({ ...drafts, [locale]: next });
  };
  const edit = (key: string, original: string, value: string) => {
    const next = { ...draft };
    if (value === original) delete next[key];
    else next[key] = value;
    update(next);
  };
  const reset = (key: string) => {
    const next = { ...draft };
    delete next[key];
    update(next);
  };

  async function save() {
    if (await store.getState().save(locale, draft)) {
      setDrafts({ ...drafts, [locale]: undefined });
      setNotice(t('customization.terminology.saved'));
    }
  }

  const languageName = t(`app.languages.${locale}`);
  return (
    <div className="flex flex-col gap-[0.8rem]">
      <p className="m-0 text-[0.85rem] text-muted">{t('customization.terminology.intro')}</p>
      <div className="flex flex-wrap items-end gap-[0.8rem]">
        <div className={LABEL_CLASS}>
          <label htmlFor={ids.language}>{t('customization.terminology.language')}</label>
          <select id={ids.language} className={SELECT_CLASS} value={locale} onChange={(e) => isLocale(e.target.value) && setLocale(e.target.value)}>
            {SUPPORTED_LOCALES.map((l) => (
              <option key={l} value={l}>
                {t(`app.languages.${l}`)}
              </option>
            ))}
          </select>
        </div>
        <input
          type="search"
          aria-label={t('customization.terminology.search')}
          placeholder={t('customization.terminology.search')}
          className={`${INPUT_CLASS} min-w-[12rem] flex-1`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="flex items-center gap-[0.4rem] text-[0.85rem] text-muted">
          <input type="checkbox" checked={renamedOnly} onChange={(e) => setRenamedOnly(e.target.checked)} />
          {t('customization.terminology.modifiedOnly')}
        </label>
        {editable && (
          <>
            <Button disabled={Object.keys(draft).length === 0} onClick={() => update({})}>
              {t('customization.terminology.resetAll', { language: languageName })}
            </Button>
            <Button variant="primary" disabled={!dirty || invalid.length > 0} onClick={() => void save()}>
              {t('customization.terminology.save')}
            </Button>
          </>
        )}
      </div>
      {invalid.length > 0 && (
        <p role="alert" className="m-0 text-[0.82rem] text-down-text">
          {invalid.some(([, v]) => v.trim().length === 0) ? t('customization.terminology.empty') : t('customization.terminology.tooLong', { max: LABEL_MAX_LENGTH })}
        </p>
      )}
      {error && (
        <p role="alert" className="m-0 text-[0.82rem] text-down-text">
          {t(error.key, error.params ?? {})}
        </p>
      )}
      {notice && (
        <p role="status" className="m-0 text-[0.82rem] text-ok-text">
          {notice}
        </p>
      )}
      <p className="m-0 text-[0.75rem] text-dim">{t('customization.terminology.count', { shown: Math.min(visible.length, MAX_ROWS), total: entries.length })}</p>
      <table className="w-full border-collapse text-[0.85rem]">
        <thead>
          <tr className="border-b border-line text-left text-[0.75rem] text-muted">
            <th className="py-[0.35rem] font-semibold">{t('customization.terminology.key')}</th>
            <th className="py-[0.35rem] font-semibold">{t('customization.terminology.original')}</th>
            <th className="py-[0.35rem] font-semibold">{t('customization.terminology.custom')}</th>
            <th className="sr-only">{t('customization.editor.reset')}</th>
          </tr>
        </thead>
        <tbody>
          {visible.slice(0, MAX_ROWS).map((entry) => {
            const value = draft[entry.key] ?? entry.text;
            return (
              <tr key={entry.key} aria-label={entry.key} className="border-b border-line last:border-0 align-middle">
                <td className="py-[0.35rem] pr-[0.6rem] font-mono text-[0.75rem] text-muted break-all">{entry.key}</td>
                <td className="py-[0.35rem] pr-[0.6rem] text-muted">{entry.text}</td>
                <td className="py-[0.35rem] pr-[0.6rem]">
                  <input
                    aria-label={`${entry.key} — ${t('customization.terminology.custom')}`}
                    className={INPUT_CLASS}
                    value={value}
                    readOnly={!editable}
                    maxLength={LABEL_MAX_LENGTH + 1}
                    onChange={(e) => edit(entry.key, entry.text, e.target.value)}
                  />
                </td>
                <td className="py-[0.35rem] text-right">
                  {editable && entry.key in draft && (
                    <Button variant="ghost" aria-label={t('customization.terminology.reset', { key: entry.key })} onClick={() => reset(entry.key)}>
                      {t('customization.editor.reset')}
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {visible.length > MAX_ROWS && <p className="m-0 text-[0.78rem] text-dim">{t('customization.terminology.more', { count: MAX_ROWS })}</p>}
    </div>
  );
}
