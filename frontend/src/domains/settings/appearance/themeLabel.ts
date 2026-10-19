import type { TFunction } from 'i18next';
import type { OrbitTheme } from '@/shared/theme';

/** Editor-inspired and custom themes keep their own name; Orbit's own themes are translated. */
export function themeLabel(t: TFunction, theme: OrbitTheme): string {
  if (theme.category === 'editor' || theme.category === 'custom') return theme.name;
  return t(`theme.presets.${theme.id}` as 'theme.presets.orbit-dark', { defaultValue: theme.name });
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function matchesQuery(t: TFunction, theme: OrbitTheme, query: string): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  return [themeLabel(t, theme), theme.name, theme.inspiredBy ?? '', theme.id].some((s) => fold(s).includes(q));
}

/** Copy of any theme as a new custom theme, with a free id. */
export function duplicateTheme(theme: OrbitTheme, label: string, takenIds: ReadonlySet<string>): OrbitTheme {
  const base = `${theme.id.slice(0, 40)}-copy`;
  let id = base;
  for (let n = 2; takenIds.has(id); n++) id = `${base}-${n}`;
  return {
    id,
    name: `${label} (copy)`.slice(0, 60),
    mode: theme.mode,
    category: 'custom',
    colors: { ...theme.colors },
    chart: theme.chart,
    syntax: { ...theme.syntax },
    fx: { ...theme.fx },
    basedOn: theme.id,
  };
}
