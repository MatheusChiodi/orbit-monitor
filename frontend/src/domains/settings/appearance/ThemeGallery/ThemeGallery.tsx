import { useCallback, useDeferredValue, useId, useMemo, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { translate, type Message } from '@/shared/i18n/message';
import { exportTheme, parseThemeFile, useTheme, type OrbitTheme, type ThemeFix } from '@/shared/theme';
import { Button, INPUT_CLASS } from '@/shared/ui';
import { ImportReview } from '../ImportReview';
import { ThemeCard } from '../ThemeCard';
import { duplicateTheme, matchesQuery, themeLabel } from '../themeLabel';

export const GALLERY_FILTERS = ['all', 'dark', 'light', 'accessible', 'favorites', 'custom'] as const;
export type GalleryFilter = (typeof GALLERY_FILTERS)[number];

export interface ThemeGalleryProps {
  /** Opens the editor (FE-01) with a theme to edit or a fresh copy. */
  onEdit: (theme: OrbitTheme) => void;
  onSaveCustom: (theme: OrbitTheme) => void;
  onDeleteCustom: (id: string) => void;
  readOnly?: boolean;
}

interface PendingImport {
  theme: OrbitTheme;
  fixes: readonly ThemeFix[];
  fromVsCode: boolean;
}

function download(theme: OrbitTheme) {
  const url = URL.createObjectURL(new Blob([exportTheme(theme)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${theme.id}.orbit-theme.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function matchesFilter(theme: OrbitTheme, filter: GalleryFilter, favorites: readonly string[]): boolean {
  switch (filter) {
    case 'dark':
    case 'light':
      return theme.mode === filter;
    case 'accessible':
      return theme.category === 'accessible';
    case 'favorites':
      return favorites.includes(theme.id);
    case 'custom':
      return theme.category === 'custom';
    default:
      return true;
  }
}

/** FE-03: Settings → Appearance gallery with filters, search, favorites, hover preview and import. */
export function ThemeGallery({ onEdit, onSaveCustom, onDeleteCustom, readOnly = false }: ThemeGalleryProps) {
  const { t } = useTranslation();
  const { theme: current, themes, favorites, setDeviceTheme, preview, toggleFavorite, deviceThemeId, previewing, source } = useTheme();
  const [filter, setFilter] = useState<GalleryFilter>('all');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [importError, setImportError] = useState<Message | null>(null);
  const importId = useId();

  // The card "in use" is the applied theme, not the one under the pointer.
  const appliedId = previewing ? null : current.id;
  const activeId = appliedId ?? (deviceThemeId && themes.some((x) => x.id === deviceThemeId) ? deviceThemeId : null);

  const visible = useMemo(
    () => themes.filter((theme) => matchesFilter(theme, filter, favorites) && matchesQuery(t, theme, deferredQuery)),
    [themes, filter, favorites, deferredQuery, t],
  );

  const ids = useMemo(() => new Set(themes.map((x) => x.id)), [themes]);
  const onDuplicate = useCallback((theme: OrbitTheme) => onEdit(duplicateTheme(theme, themeLabel(t, theme), ids)), [onEdit, t, ids]);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    setImportError(null);
    const result = parseThemeFile(await file.text());
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    let id = result.theme.id;
    for (let n = 2; ids.has(id); n++) id = `${result.theme.id.slice(0, 40)}-${n}`;
    const fromVsCode = 'source' in result;
    setPending({ theme: { ...result.theme, id }, fixes: fromVsCode ? result.fixes : [], fromVsCode });
  };

  const filterLabel = (f: GalleryFilter) => t(`theme.gallery.filter.${f}`);
  return (
    <section aria-labelledby={`${importId}-title`} className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[40rem]">
          <h2 id={`${importId}-title`} className="font-display text-[1.5rem] font-bold text-text">
            {t('theme.gallery.title')}
          </h2>
          <p className="text-[0.85rem] text-muted">{t('theme.gallery.intro')}</p>
          <p className="mt-1 text-[0.75rem] text-dim">{t(`theme.gallery.scope.${source}`)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => setDeviceTheme(null)}>
            {t('theme.gallery.restoreDefault')}
          </Button>
          <label
            htmlFor={importId}
            title={t('theme.gallery.importHint')}
            className="inline-flex h-[2.2rem] cursor-pointer items-center rounded-[0.45rem] border border-line-2 bg-s3 px-[0.9rem] text-[0.85rem] font-semibold text-text hover:bg-s2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-info"
          >
            {t('theme.gallery.import')}
            <input id={importId} type="file" accept=".json,application/json" className="sr-only" disabled={readOnly} onChange={onFile} />
          </label>
        </div>
      </header>

      {importError ? (
        <p role="alert" className="rounded-[0.5rem] border border-down/60 bg-down/10 px-3 py-2 text-[0.82rem] text-down-text">
          {translate(t, importError)}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          aria-label={t('theme.gallery.search')}
          placeholder={t('theme.gallery.search')}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          className={`${INPUT_CLASS} max-w-[18rem]`}
        />
        <div role="group" aria-label={t('theme.gallery.filters')} className="flex flex-wrap gap-1 rounded-[0.55rem] border border-line bg-s1 p-1">
          {GALLERY_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className="rounded-[0.4rem] px-3 py-1 text-[0.8rem] text-muted hover:text-text aria-pressed:bg-s3 aria-pressed:font-semibold aria-pressed:text-text"
            >
              {filterLabel(f)}
            </button>
          ))}
        </div>
        <p className="ml-auto text-[0.78rem] text-dim" aria-live="polite">
          {t('theme.gallery.count', { count: visible.length })}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-[0.6rem] border border-dashed border-line-2 p-6 text-center text-[0.85rem] text-muted">
          {filter === 'favorites' && !deferredQuery ? t('theme.gallery.emptyFavorites') : t('theme.gallery.empty', { query: deferredQuery })}
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
          {visible.map((theme) => {
            const custom = theme.category === 'custom';
            return (
              <ThemeCard
                key={theme.id}
                theme={theme}
                label={themeLabel(t, theme)}
                active={theme.id === activeId}
                favorite={favorites.includes(theme.id)}
                readOnly={readOnly}
                onApply={setDeviceTheme}
                onPreview={preview}
                onToggleFavorite={toggleFavorite}
                onDuplicate={onDuplicate}
                onExport={download}
                {...(custom ? { onEdit, onDelete: onDeleteCustom } : {})}
              />
            );
          })}
        </ul>
      )}

      {pending ? (
        <ImportReview
          theme={pending.theme}
          fixes={pending.fixes}
          fromVsCode={pending.fromVsCode}
          onCancel={() => setPending(null)}
          onSave={(theme) => {
            onSaveCustom(theme);
            setPending(null);
          }}
        />
      ) : null}
    </section>
  );
}
