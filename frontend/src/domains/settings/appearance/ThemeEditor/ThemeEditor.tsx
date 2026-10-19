import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { translate } from '@/shared/i18n/message';
import {
  BUILT_IN_THEMES,
  CHART_SIZE,
  FX_TOKENS,
  SYNTAX_TOKENS,
  THEME_NAME_MAX,
  THEME_PATHS,
  checkPalette,
  fixTheme,
  isHexColor,
  normalizeHex,
  suggestToken,
  tokenValue,
  withToken,
  type ContrastIssue,
  type OrbitTheme,
} from '@/shared/theme';
import { Button, INPUT_CLASS, LABEL_CLASS, SELECT_CLASS } from '@/shared/ui';
import { ColorField } from '../ColorField';
import { ConsolePreview } from '../ConsolePreview';
import { WallPreview } from '../WallPreview';

export interface ThemeEditorProps {
  theme: OrbitTheme;
  onSave: (theme: OrbitTheme) => void;
  onCancel: () => void;
  readOnly?: boolean;
}

const pathLabel = (path: string) => path.replace(/^chart\.(\d)$/, (_, i: string) => `chart ${Number(i) + 1}`).replace('.', ' ');

const GROUPS: readonly { key: string; paths: readonly string[] }[] = [
  { key: 'surfaces', paths: ['bg', 's1', 's2', 's3', 'line', 'line2'] },
  { key: 'text', paths: ['text', 'muted', 'dim', 'accent'] },
  { key: 'status', paths: ['ok', 'warn', 'down', 'info'] },
  { key: 'chart', paths: Array.from({ length: CHART_SIZE }, (_, i) => `chart.${i}`) },
  { key: 'syntax', paths: SYNTAX_TOKENS.map((t) => `syntax.${t}`) },
  { key: 'fx', paths: FX_TOKENS.map((t) => `fx.${t}`) },
];

const rawValues = (theme: OrbitTheme) => Object.fromEntries(THEME_PATHS.map((p) => [p, tokenValue(theme, p)!]));

/** FE-01: edit every token with a live wall and console preview; the contrast guard blocks saving. */
export function ThemeEditor({ theme, onSave, onCancel, readOnly = false }: ThemeEditorProps) {
  const { t } = useTranslation();
  const nameId = useId();
  const presetId = useId();
  const [draft, setDraft] = useState<OrbitTheme>(theme);
  const [raw, setRaw] = useState<Record<string, string>>(() => rawValues(theme));
  const [name, setName] = useState(theme.name);

  const issues = useMemo(() => checkPalette(draft), [draft]);
  // One row per token: the suggestion fixes it against every surface at once.
  const rows = useMemo(() => {
    const byToken = new Map<string, ContrastIssue>();
    for (const issue of issues) if (!byToken.has(issue.foreground)) byToken.set(issue.foreground, issue);
    return [...byToken.values()];
  }, [issues]);

  const edit = (path: string, value: string) => {
    setRaw((r) => ({ ...r, [path]: value }));
    if (isHexColor(value)) setDraft((d) => withToken(d, path, normalizeHex(value)));
  };

  const replace = (next: OrbitTheme) => {
    setDraft(next);
    setRaw(rawValues(next));
  };

  const startFrom = (id: string) => {
    const preset = BUILT_IN_THEMES.find((p) => p.id === id);
    if (!preset) return;
    replace({ ...draft, mode: preset.mode, colors: preset.colors, chart: preset.chart, syntax: preset.syntax, fx: preset.fx, basedOn: preset.id });
  };

  const save = () => {
    if (issues.length > 0 || readOnly) return;
    const { adjusted: _adjusted, ...rest } = draft;
    onSave({ ...rest, name: name.trim().slice(0, THEME_NAME_MAX) || theme.name, category: 'custom' });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
    }
  };

  const preview = { ...draft, name };
  return (
    <form
      aria-label={t('theme.editor.title')}
      onKeyDown={onKeyDown}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]"
    >
      <div className="flex flex-col gap-5">
        <h2 className="font-display text-[1.5rem] font-bold text-text">{t('theme.editor.title')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label htmlFor={nameId} className={LABEL_CLASS}>
            {t('theme.editor.name')}
            <input
              id={nameId}
              className={INPUT_CLASS}
              value={name}
              maxLength={THEME_NAME_MAX}
              disabled={readOnly}
              onChange={(e) => setName(e.currentTarget.value)}
            />
          </label>
          <label htmlFor={presetId} className={LABEL_CLASS}>
            {t('theme.editor.startFrom')}
            <select id={presetId} className={SELECT_CLASS} disabled={readOnly} value="" onChange={(e) => startFrom(e.currentTarget.value)}>
              <option value="" disabled>
                —
              </option>
              {BUILT_IN_THEMES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.category === 'editor' ? p.name : t(`theme.presets.${p.id}` as 'theme.presets.orbit-dark')}
                </option>
              ))}
            </select>
          </label>
        </div>

        {GROUPS.map((group) => (
          <fieldset key={group.key} className="flex flex-col gap-2 rounded-[0.6rem] border border-line p-3">
            <legend className="section-label px-1">{t(`theme.editor.groups.${group.key}` as 'theme.editor.groups.text')}</legend>
            {group.paths.map((path) => (
              <ColorField key={path} label={pathLabel(path)} value={raw[path] ?? ''} disabled={readOnly} onChange={(v) => edit(path, v)} />
            ))}
          </fieldset>
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
        <WallPreview theme={preview} label={t('theme.editor.wallPreview')} />
        <ConsolePreview theme={preview} label={t('theme.editor.consolePreview')} />

        {rows.length > 0 ? (
          <div role="alert" className="flex flex-col gap-2 rounded-[0.6rem] border border-down/60 bg-down/10 p-3">
            <p className="text-[0.85rem] font-semibold text-down-text">
              {t('theme.editor.issues')} · {t('theme.editor.issueCount', { count: rows.length })}
            </p>
            <ul className="flex flex-col gap-2">
              {rows.map((issue) => (
                <li key={issue.foreground} className="flex flex-wrap items-center justify-between gap-2 text-[0.8rem] text-text">
                  <span>{translate(t, issue.message)}</span>
                  {readOnly ? null : (
                    <Button
                      variant="neutral"
                      onClick={() => {
                        const value = suggestToken(draft, issue.foreground);
                        if (value) edit(issue.foreground, value);
                      }}
                    >
                      {t('theme.editor.useSuggested')}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {readOnly || rows.length < 2 ? null : (
              <Button variant="neutral" className="self-start" onClick={() => replace(fixTheme(draft).theme)}>
                {t('theme.editor.fixAll')}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-[0.8rem] text-muted">{t('theme.editor.allGood')}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {t('theme.editor.cancel')}
          </Button>
          {readOnly ? null : (
            <Button type="submit" variant="primary" disabled={issues.length > 0}>
              {t('theme.editor.save')}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
