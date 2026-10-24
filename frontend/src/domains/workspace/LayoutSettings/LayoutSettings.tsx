import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ANIMATION_LEVELS, isAnimationLevel } from '@/shared/motion/animationLevel';
import { safeText } from '@/shared/privacy/redact';
import { Button, Field, IconClose, IconPlus, Select, TextInput } from '@/shared/ui';
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
  /** The other saved layouts, for the playlist (shown by name). */
  layouts: readonly Pick<WallLayout, 'slug' | 'name'>[];
  editable: boolean;
}

const DEFAULT_SECONDS = 60;

export function LayoutSettings({ value, onChange, themes, layouts, editable }: LayoutSettingsProps) {
  const { t } = useTranslation();
  const id = useId();
  const entries = value.playlist?.entries ?? [];
  const choices = [{ slug: value.slug, name: value.name }, ...layouts.filter((l) => l.slug !== value.slug)].filter((l) => l.slug);
  const slugValid = SLUG_PATTERN.test(value.slug);

  const setEntries = (next: PlaylistEntry[]) => onChange({ ...value, playlist: next.length > 0 ? { entries: next } : undefined });
  const setEntry = (index: number, patch: Partial<PlaylistEntry>) => setEntries(entries.map((e, i) => (i === index ? { ...e, ...patch } : e)));

  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0" disabled={!editable}>
      <legend className="sr-only">{t('layout.settings.title')}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('layout.settings.name')}>
          <TextInput value={value.name} maxLength={80} onChange={(e) => onChange({ ...value, name: e.target.value })} />
        </Field>
        <Field label={t('layout.settings.slug')} error={slugValid ? undefined : t('layout.settings.slugInvalid')}>
          <TextInput className="font-mono" value={value.slug} onChange={(e) => onChange({ ...value, slug: e.target.value.toLowerCase() })} />
        </Field>
        <Field label={t('layout.settings.theme')}>
          <Select value={value.themeId ?? ''} onChange={(e) => onChange({ ...value, themeId: e.target.value || undefined })}>
            <option value="">{t('layout.settings.themeInherit')}</option>
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('layout.settings.animation')}>
          <Select
            value={value.animationLevel ?? ''}
            onChange={(e) => onChange({ ...value, animationLevel: isAnimationLevel(e.target.value) ? e.target.value : undefined })}
          >
            <option value="">{t('layout.settings.animationInherit')}</option>
            {ANIMATION_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(`preferences.animationLevels.${level}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <section aria-labelledby={`${id}-playlist`} className="flex flex-col gap-2 border-t border-line pt-3">
        <h3 id={`${id}-playlist`} className="m-0 text-base font-semibold text-text">
          {t('layout.settings.playlist')}
        </h3>
        <p className="m-0 text-sm text-muted">{t('layout.settings.playlistHint')}</p>
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {entries.map((entry, index) => {
            const position = index + 1;
            return (
              <li key={index} className="flex flex-wrap items-end gap-2">
                <Field label={t('layout.settings.playlistLayout', { position })} className="min-w-48 flex-1">
                  <Select value={entry.layout} onChange={(e) => setEntry(index, { layout: e.target.value })}>
                    {choices.map((layout) => (
                      <option key={layout.slug} value={layout.slug}>
                        {safeText(layout.name || layout.slug)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('layout.settings.playlistSeconds', { position })} className="w-40">
                  <TextInput
                    type="number"
                    min={MIN_ENTRY_SECONDS}
                    value={entry.seconds}
                    onChange={(e) => setEntry(index, { seconds: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                    onBlur={() => setEntry(index, { seconds: Math.max(MIN_ENTRY_SECONDS, entry.seconds) })}
                  />
                </Field>
                <Button variant="ghost" iconOnly aria-label={t('layout.settings.playlistRemove', { position })} onClick={() => setEntries(entries.filter((_, i) => i !== index))}>
                  <IconClose />
                </Button>
              </li>
            );
          })}
        </ol>
        <div>
          <Button size="sm" onClick={() => setEntries([...entries, { layout: value.slug, seconds: DEFAULT_SECONDS }])}>
            <IconPlus />
            {t('layout.settings.playlistAdd')}
          </Button>
        </div>
      </section>
    </fieldset>
  );
}
