import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ANIMATION_LEVELS, isAnimationLevel } from '@/shared/motion/animationLevel';
import { Button, INPUT_CLASS, LABEL_CLASS, SELECT_CLASS } from '@/shared/ui';
import type { PlaylistEntry } from '@/domains/wall/playlist/playlist';
import { MIN_ENTRY_SECONDS } from '@/domains/wall/playlist/playlist';
import { SLUG_PATTERN, type WallLayout } from '../layout/layoutsApi';

/** Layout fields besides the blocks: name, address, FE-05 theme, FE-06 animation and FE-19 playlist. */
export type LayoutSettingsValue = Pick<WallLayout, 'name' | 'slug' | 'themeId' | 'animationLevel' | 'playlist'>;

export interface LayoutSettingsProps {
  value: LayoutSettingsValue;
  onChange: (value: LayoutSettingsValue) => void;
  /** Theme choices (built-in and custom). */
  themes: readonly { id: string; name: string }[];
  /** Slugs of the other saved layouts, for the playlist. */
  slugs: readonly string[];
  editable: boolean;
}

const DEFAULT_SECONDS = 60;

export function LayoutSettings({ value, onChange, themes, slugs, editable }: LayoutSettingsProps) {
  const { t } = useTranslation();
  const id = useId();
  const entries = value.playlist?.entries ?? [];
  const choices = [...new Set([value.slug, ...slugs])].filter(Boolean);
  const slugValid = SLUG_PATTERN.test(value.slug);

  const setEntries = (next: PlaylistEntry[]) => onChange({ ...value, playlist: next.length > 0 ? { entries: next } : undefined });
  const setEntry = (index: number, patch: Partial<PlaylistEntry>) => setEntries(entries.map((e, i) => (i === index ? { ...e, ...patch } : e)));

  return (
    <fieldset className="m-0 flex flex-col gap-[0.8rem] rounded-[0.9rem] border border-line p-[0.8rem]" disabled={!editable}>
      <legend className="px-[0.3rem] text-[0.85rem] font-semibold">{t('layout.settings.title')}</legend>
      <div className="grid gap-[0.8rem] sm:grid-cols-2 lg:grid-cols-4">
        <span className={LABEL_CLASS}>
          <label htmlFor={`${id}-name`}>{t('layout.settings.name')}</label>
          <input id={`${id}-name`} className={INPUT_CLASS} value={value.name} maxLength={80} onChange={(e) => onChange({ ...value, name: e.target.value })} />
        </span>
        <span className={LABEL_CLASS}>
          <label htmlFor={`${id}-slug`}>{t('layout.settings.slug')}</label>
          <input
            id={`${id}-slug`}
            className={INPUT_CLASS}
            value={value.slug}
            aria-invalid={!slugValid}
            aria-describedby={slugValid ? undefined : `${id}-slug-error`}
            onChange={(e) => onChange({ ...value, slug: e.target.value.toLowerCase() })}
          />
          {!slugValid && (
            <span id={`${id}-slug-error`} className="text-[0.75rem] text-down-text">
              {t('layout.settings.slugInvalid')}
            </span>
          )}
        </span>
        <span className={LABEL_CLASS}>
          <label htmlFor={`${id}-theme`}>{t('layout.settings.theme')}</label>
          <select
            id={`${id}-theme`}
            className={SELECT_CLASS}
            value={value.themeId ?? ''}
            onChange={(e) => onChange({ ...value, themeId: e.target.value || undefined })}
          >
            <option value="">{t('layout.settings.themeInherit')}</option>
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </span>
        <span className={LABEL_CLASS}>
          <label htmlFor={`${id}-motion`}>{t('layout.settings.animation')}</label>
          <select
            id={`${id}-motion`}
            className={SELECT_CLASS}
            value={value.animationLevel ?? ''}
            onChange={(e) => onChange({ ...value, animationLevel: isAnimationLevel(e.target.value) ? e.target.value : undefined })}
          >
            <option value="">{t('layout.settings.animationInherit')}</option>
            {ANIMATION_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(`preferences.animationLevels.${level}`)}
              </option>
            ))}
          </select>
        </span>
      </div>

      <section aria-labelledby={`${id}-playlist`} className="flex flex-col gap-[0.5rem]">
        <h3 id={`${id}-playlist`} className="m-0 text-[0.85rem] font-semibold">
          {t('layout.settings.playlist')}
        </h3>
        <p className="m-0 text-[0.78rem] text-muted">{t('layout.settings.playlistHint')}</p>
        <ol className="m-0 flex list-none flex-col gap-[0.4rem] p-0">
          {entries.map((entry, index) => {
            const position = index + 1;
            return (
              <li key={index} className="flex flex-wrap items-end gap-[0.5rem]">
                <span className={LABEL_CLASS}>
                  <label htmlFor={`${id}-entry-${index}`}>{t('layout.settings.playlistLayout', { position })}</label>
                  <select id={`${id}-entry-${index}`} className={SELECT_CLASS} value={entry.layout} onChange={(e) => setEntry(index, { layout: e.target.value })}>
                    {choices.map((slug) => (
                      <option key={slug} value={slug}>
                        {slug}
                      </option>
                    ))}
                  </select>
                </span>
                <span className={LABEL_CLASS}>
                  <label htmlFor={`${id}-seconds-${index}`}>{t('layout.settings.playlistSeconds', { position })}</label>
                  <input
                    id={`${id}-seconds-${index}`}
                    type="number"
                    min={MIN_ENTRY_SECONDS}
                    className={`${INPUT_CLASS} w-[7rem]`}
                    value={entry.seconds}
                    onChange={(e) => setEntry(index, { seconds: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                    onBlur={() => setEntry(index, { seconds: Math.max(MIN_ENTRY_SECONDS, entry.seconds) })}
                  />
                </span>
                <Button variant="ghost" aria-label={t('layout.settings.playlistRemove', { position })} onClick={() => setEntries(entries.filter((_, i) => i !== index))}>
                  ×
                </Button>
              </li>
            );
          })}
        </ol>
        <div>
          <Button onClick={() => setEntries([...entries, { layout: value.slug, seconds: DEFAULT_SECONDS }])}>{t('layout.settings.playlistAdd')}</Button>
        </div>
      </section>
    </fieldset>
  );
}
