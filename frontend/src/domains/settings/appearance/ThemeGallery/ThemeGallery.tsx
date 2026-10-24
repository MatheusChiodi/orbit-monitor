import { useCallback, useDeferredValue, useId, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { translate, type Message } from '@/shared/i18n/message';
import { exportTheme, parseThemeFile, useTheme, type OrbitTheme, type ThemeFix } from '@/shared/theme';
import { Button, IconChevronDown, IconSearch, Menu, SegmentedControl, TextInput } from '@/shared/ui';
import { ImportReview } from '../ImportReview';
import { ThemeCard } from '../ThemeCard';
import { duplicateTheme, matchesQuery, themeLabel } from '../themeLabel';

export const GALLERY_FILTERS = ['all', 'dark', 'light', 'accessible', 'favorites', 'custom'] as const;
export type GalleryFilter = (typeof GALLERY_FILTERS)[number];

/**
 * The short list shown first: Orbit Dark, one light theme, high contrast, colorblind-safe and four popular
 * editor themes. Everything else is one click away under "Show all".
 */
export const CURATED_THEME_IDS = [
  'orbit-dark',
  'github-light',
  'high-contrast-dark',
  'colorblind-deuteranopia',
  'dracula',
  'one-dark',
  'nord',
  'tokyo-night',
] as const;

export interface ThemeGalleryProps {
  /** Theme chosen on this page (previewed until applied). */
  selectedId: string;
  /** Theme applied on this device. */
  appliedId: string;
  onSelect: (id: string) => void;
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
  if (typeof URL.createObjectURL !== 'function') return;
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

/** FE-03 gallery: eight suggested themes and your own, "Show all" with search and filters, import (incl. VS Code). */
export function ThemeGallery({ selectedId, appliedId, onSelect, onEdit, onSaveCustom, onDeleteCustom, readOnly = false }: ThemeGalleryProps) {
  const { t } = useTranslation();
  const { theme: current, themes, favorites, toggleFavorite, setDeviceTheme } = useTheme();
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<GalleryFilter>('all');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [importError, setImportError] = useState<Message | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const baseId = useId();

  const ids = useMemo(() => new Set(themes.map((x) => x.id)), [themes]);
  const onDuplicate = useCallback((theme: OrbitTheme) => onEdit(duplicateTheme(theme, themeLabel(t, theme), ids)), [onEdit, t, ids]);

  const suggested = useMemo(() => {
    const curated = CURATED_THEME_IDS.flatMap((id) => themes.filter((x) => x.id === id));
    // The theme in use always stays visible, even when it is not one of the suggestions.
    const extra = themes.filter((x) => (x.id === appliedId || x.id === selectedId) && x.category !== 'custom' && !curated.includes(x));
    return [...curated, ...extra];
  }, [themes, appliedId, selectedId]);
  const own = useMemo(() => themes.filter((x) => x.category === 'custom'), [themes]);
  const visible = useMemo(
    () => themes.filter((theme) => matchesFilter(theme, filter, favorites) && matchesQuery(t, theme, deferredQuery)),
    [themes, filter, favorites, deferredQuery, t],
  );

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

  const renderCards = (list: readonly OrbitTheme[]) => (
    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 xl:grid-cols-4">
      {list.map((theme) => {
        const custom = theme.category === 'custom';
        return (
          <ThemeCard
            key={theme.id}
            theme={theme}
            label={themeLabel(t, theme)}
            selected={theme.id === selectedId}
            inUse={theme.id === appliedId}
            favorite={favorites.includes(theme.id)}
            readOnly={readOnly}
            onSelect={onSelect}
            onToggleFavorite={toggleFavorite}
            onDuplicate={onDuplicate}
            onExport={download}
            {...(custom ? { onEdit, onDelete: onDeleteCustom } : {})}
          />
        );
      })}
    </ul>
  );

  return (
    <section aria-labelledby={`${baseId}-title`} className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={`${baseId}-title`} className="m-0 text-md font-semibold text-text">
            {t('settingsHub.appearance.theme')}
          </h2>
          <p className="m-0 text-sm text-muted">{t('settingsHub.appearance.themeHint')}</p>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          aria-label={t('theme.gallery.import')}
          tabIndex={-1}
          className="sr-only"
          disabled={readOnly}
          onChange={(e) => void onFile(e)}
        />
        <div className="flex items-center gap-1">
          <Button size="sm" disabled={readOnly} onClick={() => fileInput.current?.click()}>
            {t('settingsHub.appearance.importTheme')}
          </Button>
          <Menu
            size="sm"
            label={t('settingsHub.appearance.themeMenu')}
            items={[
              { id: 'create', label: t('settingsHub.appearance.createTheme'), disabled: readOnly, onSelect: () => onDuplicate(current) },
              { id: 'restore', label: t('theme.gallery.restoreDefault'), onSelect: () => setDeviceTheme(null) },
            ]}
          />
        </div>
      </header>

      {importError && (
        <p role="alert" className="m-0 rounded-sm border border-down/60 bg-down/10 px-3 py-2 text-sm text-down-text">
          {translate(t, importError)}
        </p>
      )}

      {showAll ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-xs">
              <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-dim" />
              <TextInput
                type="search"
                aria-label={t('theme.gallery.search')}
                placeholder={t('theme.gallery.search')}
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                className="pl-8"
              />
            </div>
            <SegmentedControl
              size="sm"
              label={t('theme.gallery.filters')}
              value={filter}
              onChange={setFilter}
              options={GALLERY_FILTERS.map((f) => ({ value: f, label: t(`theme.gallery.filter.${f}`) }))}
              className="max-w-full overflow-x-auto"
            />
            <p className="m-0 ml-auto text-xs text-dim" aria-live="polite">
              {t('theme.gallery.count', { count: visible.length })}
            </p>
          </div>
          {visible.length === 0 ? (
            <p className="m-0 rounded-md border border-dashed border-line-2 p-6 text-center text-sm text-muted">
              {filter === 'favorites' && !deferredQuery ? t('theme.gallery.emptyFavorites') : t('theme.gallery.empty', { query: deferredQuery })}
            </p>
          ) : (
            renderCards(visible)
          )}
        </div>
      ) : (
        <>
          {renderCards(suggested)}
          {own.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="section-label m-0">{t('settingsHub.appearance.yours')}</h3>
              {renderCards(own)}
            </div>
          )}
        </>
      )}

      <Button variant="ghost" size="sm" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)} className="self-start">
        <IconChevronDown className={showAll ? 'rotate-180' : ''} />
        {showAll ? t('settingsHub.appearance.showFewer') : t('settingsHub.appearance.showAll', { count: themes.length })}
      </Button>

      {pending && (
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
      )}
    </section>
  );
}
