/** FE-72: the sections of the one Settings area (`#/settings/<section>`). */
export const SETTINGS_SECTIONS = ['general', 'appearance', 'wall-layouts', 'connections', 'advanced'] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const DEFAULT_SETTINGS_SECTION: SettingsSection = 'general';

export function isSettingsSection(value: unknown): value is SettingsSection {
  return typeof value === 'string' && (SETTINGS_SECTIONS as readonly string[]).includes(value);
}

/** Hash of a section; a wall layout id opens that layout inside "Wall layouts". */
export function settingsHref(section: SettingsSection, layoutId?: string | null): string {
  if (section === 'wall-layouts' && layoutId) return `#/settings/wall-layouts/${encodeURIComponent(layoutId)}`;
  return section === 'general' ? '#/settings' : `#/settings/${section}`;
}
