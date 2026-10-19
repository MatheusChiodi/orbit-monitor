import { CHART_SIZE, COLOR_TOKENS, FX_TOKENS, SYNTAX_TOKENS, type ColorToken, type FxToken, type OrbitTheme, type SyntaxToken, type ThemeChart } from './types';

/** Every editable color of a theme as a path: `bg`, `chart.0`, `syntax.keyword`, `fx.glow`. */
export const THEME_PATHS: readonly string[] = [
  ...COLOR_TOKENS,
  ...Array.from({ length: CHART_SIZE }, (_, i) => `chart.${i}`),
  ...SYNTAX_TOKENS.map((t) => `syntax.${t}`),
  ...FX_TOKENS.map((t) => `fx.${t}`),
];

type Palette = Pick<OrbitTheme, 'colors' | 'chart' | 'syntax' | 'fx'>;

export function tokenValue(theme: Palette, path: string): string | undefined {
  const [group, key] = path.includes('.') ? path.split('.') : ['colors', path];
  if (group === 'colors') return theme.colors[key as ColorToken];
  if (group === 'chart') return theme.chart[Number(key)];
  if (group === 'syntax') return theme.syntax[key as SyntaxToken];
  if (group === 'fx') return theme.fx[key as FxToken];
  return undefined;
}

export function withToken<T extends Palette>(theme: T, path: string, value: string): T {
  const [group, key] = path.includes('.') ? path.split('.') : ['colors', path];
  if (group === 'colors') return { ...theme, colors: { ...theme.colors, [key!]: value } };
  if (group === 'chart') {
    const chart = [...theme.chart];
    chart[Number(key)] = value;
    return { ...theme, chart: chart as unknown as ThemeChart };
  }
  if (group === 'syntax') return { ...theme, syntax: { ...theme.syntax, [key!]: value } };
  if (group === 'fx') return { ...theme, fx: { ...theme.fx, [key!]: value } };
  return theme;
}
