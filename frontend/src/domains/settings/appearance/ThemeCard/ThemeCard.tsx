import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { OrbitTheme } from '@/shared/theme';
import { IconButton, IconCopy, IconDownload, IconEdit, IconTrash, Menu, type IconProps, type MenuItem } from '@/shared/ui';
import { WallPreview } from '../WallPreview';

export interface ThemeCardProps {
  theme: OrbitTheme;
  label: string;
  /** Chosen on this page (previewed on the real screen until it is applied). */
  selected: boolean;
  /** Applied on this device right now. */
  inUse: boolean;
  favorite: boolean;
  readOnly?: boolean;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDuplicate: (theme: OrbitTheme) => void;
  onExport: (theme: OrbitTheme) => void;
  onEdit?: (theme: OrbitTheme) => void;
  onDelete?: (id: string) => void;
}

const STATUS_SWATCHES = ['ok', 'warn', 'down', 'info'] as const;

function StarIcon({ size = 16, className = '', fill = 'none' }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" className={className}>
      <path
        d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.6L10 14.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"
        fill={fill}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
const StarFilled = (props: IconProps) => <StarIcon {...props} fill="currentColor" />;

/** Gallery card: the thumbnail is a live mini wall; choosing it previews the theme; the rest sits in a "…" menu. */
export const ThemeCard = memo(function ThemeCard({
  theme,
  label,
  selected,
  inUse,
  favorite,
  readOnly = false,
  onSelect,
  onToggleFavorite,
  onDuplicate,
  onExport,
  onEdit,
  onDelete,
}: ThemeCardProps) {
  const { t } = useTranslation();
  const items: MenuItem[] = [
    { id: 'duplicate', label: t('theme.gallery.duplicate'), icon: IconCopy, disabled: readOnly, onSelect: () => onDuplicate(theme) },
    { id: 'export', label: t('theme.gallery.export'), icon: IconDownload, onSelect: () => onExport(theme) },
    ...(onEdit ? [{ id: 'edit', label: t('theme.gallery.edit'), icon: IconEdit, disabled: readOnly, onSelect: () => onEdit(theme) }] : []),
    ...(onDelete ? [{ id: 'delete', label: t('theme.gallery.delete'), icon: IconTrash, danger: true, disabled: readOnly, onSelect: () => onDelete(theme.id) }] : []),
  ];
  return (
    <li
      aria-label={label}
      data-selected={selected || undefined}
      className="flex flex-col gap-2 rounded-md border border-line bg-s1 p-2 transition-colors duration-120 hover:border-line-2 data-[selected]:border-accent data-[selected]:ring-1 data-[selected]:ring-accent"
    >
      <button
        type="button"
        aria-pressed={selected}
        aria-label={t('theme.gallery.apply', { name: label })}
        onClick={() => onSelect(theme.id)}
        className="block w-full cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <WallPreview theme={theme} size="card" />
      </button>

      <div className="flex items-start justify-between gap-1 pl-1">
        <div className="min-w-0 py-0.5">
          <p className="m-0 text-base font-semibold break-words text-text">{label}</p>
          <p className="m-0 flex items-center gap-1.5 text-xs text-muted" title={theme.inspiredBy ? t('theme.gallery.inspiredBy', { name: theme.inspiredBy }) : undefined}>
            <span aria-hidden="true" className="flex gap-0.5">
              {STATUS_SWATCHES.map((s) => (
                <span key={s} className="size-2 rounded-full" style={{ background: theme.colors[s] }} />
              ))}
            </span>
            {t(`theme.gallery.mode.${theme.mode}`)}
          </p>
          {inUse && <p className="m-0 mt-1 text-xs font-semibold text-accent">{t('theme.gallery.current')}</p>}
        </div>
        <div className="flex shrink-0 items-center">
          <IconButton
            size="sm"
            icon={favorite ? StarFilled : StarIcon}
            aria-pressed={favorite}
            label={t(favorite ? 'theme.gallery.unfavorite' : 'theme.gallery.favorite', { name: label })}
            onClick={() => onToggleFavorite(theme.id)}
            className={favorite ? 'text-warn' : 'text-dim'}
          />
          <Menu size="sm" label={t('settingsHub.appearance.themeActions', { name: label })} items={items} />
        </div>
      </div>
    </li>
  );
});
