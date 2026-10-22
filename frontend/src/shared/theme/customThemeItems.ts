import { isBuiltInThemeId } from './defaults';
import { validateTheme } from './schema';
import type { OrbitTheme } from './types';

/** Untrusted file content → clean custom themes; invalid items and built-in ids are dropped. */
export function sanitizeCustomThemes(items: readonly unknown[]): OrbitTheme[] {
  const seen = new Set<string>();
  const themes: OrbitTheme[] = [];
  for (const item of items) {
    const result = validateTheme(typeof item === 'object' && item !== null ? { ...item, category: 'custom' } : item);
    if (!result.ok || isBuiltInThemeId(result.theme.id) || seen.has(result.theme.id)) continue;
    seen.add(result.theme.id);
    themes.push(result.theme);
  }
  return themes;
}
