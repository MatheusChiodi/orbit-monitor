import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { OrbitTheme } from '@/shared/theme';
import { WallPreview } from '../WallPreview';

export interface ThemeCardProps {
  theme: OrbitTheme;
  label: string;
  active: boolean;
  favorite: boolean;
  readOnly?: boolean;
  onApply: (id: string) => void;
  onPreview: (id: string | null) => void;
  onToggleFavorite: (id: string) => void;
  onDuplicate: (theme: OrbitTheme) => void;
  onExport: (theme: OrbitTheme) => void;
  onEdit?: (theme: OrbitTheme) => void;
  onDelete?: (id: string) => void;
}

const STATUS_SWATCHES = ['ok', 'warn', 'down', 'info'] as const;
const ACTION ='rounded-[0.35rem] px-2 py-1 text-[0.72rem] text-muted hover:bg-s3 hover:text-text disabled:opacity-40';

/** Gallery card: the thumbnail is a live mini wall; hover or focus previews the theme on the real screen. */
export const ThemeCard = memo(function ThemeCard({
  theme,
  label,
  active,
  favorite,
  readOnly = false,
  onApply,
  onPreview,
  onToggleFavorite,
  onDuplicate,
  onExport,
  onEdit,
  onDelete,
}: ThemeCardProps) {
  const { t } = useTranslation();
  const end = () => onPreview(null);
  return (
    <li
      aria-label={label}
      data-active={active || undefined}
      className="group flex flex-col gap-2 rounded-[0.7rem] border border-line bg-s1 p-2 data-[active]:border-info data-[active]:ring-1 data-[active]:ring-info"
    >
      <button
        type="button"
        aria-pressed={active}
        aria-label={t('theme.gallery.apply', { name: label })}
        onClick={() => onApply(theme.id)}
        onPointerEnter={() => onPreview(theme.id)}
        onPointerLeave={end}
        onFocus={() => onPreview(theme.id)}
        onBlur={end}
        className="block w-full rounded-[0.5rem] focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <WallPreview theme={theme} size="card" />
      </button>

      <div className="flex items-start justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="truncate text-[0.88rem] font-semibold text-text">{label}</p>
          <p className="truncate text-[0.72rem] text-muted">
            {theme.inspiredBy ? t('theme.gallery.inspiredBy', { name: theme.inspiredBy }) : t(`theme.gallery.mode.${theme.mode}`)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {active ? <span className="rounded-full bg-info/15 px-2 py-[0.1rem] text-[0.65rem] font-semibold text-info">{t('theme.gallery.current')}</span> : null}
          <button
            type="button"
            aria-pressed={favorite}
            aria-label={t(favorite ? 'theme.gallery.unfavorite' : 'theme.gallery.favorite', { name: label })}
            onClick={() => onToggleFavorite(theme.id)}
            className={`grid size-[1.9rem] place-items-center rounded-[0.35rem] hover:bg-s3 ${favorite ? 'text-warn' : 'text-dim'}`}
          >
            <svg viewBox="0 0 20 20" className="size-[1rem]" aria-hidden="true">
              <path
                d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.6L10 14.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"
                fill={favorite ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 px-1 pb-1">
        {STATUS_SWATCHES.map((s) => (
          <span key={s} aria-hidden="true" className="size-[0.6rem] rounded-full" style={{ background: theme.colors[s] }} />
        ))}
        {theme.adjusted ? (
          <span role="img" aria-label={t('theme.gallery.adjusted')} title={t('theme.gallery.adjusted')} className="ml-1 text-[0.7rem] text-dim">
            ◐
          </span>
        ) : null}
        <span className="flex-1" />
        <button type="button" className={ACTION} disabled={readOnly} onClick={() => onDuplicate(theme)}>
          {t('theme.gallery.duplicate')}
        </button>
        <button type="button" className={ACTION} onClick={() => onExport(theme)}>
          {t('theme.gallery.export')}
        </button>
        {onEdit ? (
          <button type="button" className={ACTION} disabled={readOnly} onClick={() => onEdit(theme)}>
            {t('theme.gallery.edit')}
          </button>
        ) : null}
        {onDelete ? (
          <button type="button" className={`${ACTION} hover:text-down-text`} disabled={readOnly} onClick={() => onDelete(theme.id)}>
            {t('theme.gallery.delete')}
          </button>
        ) : null}
      </div>
    </li>
  );
});
