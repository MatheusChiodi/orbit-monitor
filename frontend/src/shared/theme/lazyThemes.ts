import { isBuiltInThemeId } from './defaults';
import type { OrbitTheme } from './types';

/** One chunk per built-in theme: the wall loads only the theme it shows (150 KB gzip budget). */
const loaders = import.meta.glob<OrbitTheme>('./themes/*.json', { import: 'default' });

export async function loadBuiltInTheme(id: string): Promise<OrbitTheme | null> {
  const load = isBuiltInThemeId(id) ? loaders[`./themes/${id}.json`] : undefined;
  if (!load) return null;
  try {
    return await load();
  } catch {
    return null;
  }
}
