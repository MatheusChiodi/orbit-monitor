import { luminance, mix } from './color';
import { BODY_RATIO, suggestReadable } from './contrast';
import { COLOR_TOKENS, FX_TOKENS, SYNTAX_TOKENS, type ColorToken, type OrbitTheme } from './types';

/** Color cross-fade when the theme changes (docs/05 §1.3); skipped when animations are off (FE-06). */
export const THEME_TRANSITION_MS = 280;

const cssName = (token: ColorToken) => (token === 'line2' ? '--line-2' : `--${token}`);

/** Every CSS custom property a theme sets, including the derived state text colors. */
export function themeVariables(theme: OrbitTheme): Record<string, string> {
  const { colors } = theme;
  const vars: Record<string, string> = {};
  for (const token of COLOR_TOKENS) vars[cssName(token)] = colors[token];
  const dark = luminance(colors.bg) < 0.4;
  for (const status of ['ok', 'warn', 'down'] as const) {
    const tinted = mix(colors[status], dark ? '#ffffff' : '#000000', 0.6);
    vars[`--${status}-text`] = suggestReadable(tinted, colors.s1, BODY_RATIO);
  }
  theme.chart.forEach((color, i) => {
    vars[`--chart-${i + 1}`] = color;
  });
  for (const token of SYNTAX_TOKENS) vars[`--syntax-${token}`] = theme.syntax[token];
  for (const token of FX_TOKENS) vars[`--fx-${token}`] = theme.fx[token];
  return vars;
}

export interface ApplyOptions {
  /** Cross-fade colors; pass false when the animation level is `off`. */
  animate?: boolean;
}

const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

export function applyTheme(theme: OrbitTheme, target: HTMLElement, options: ApplyOptions = {}): void {
  if (options.animate) {
    clearTimeout(timers.get(target));
    target.dataset.themeTransition = '';
    timers.set(
      target,
      setTimeout(() => {
        delete target.dataset.themeTransition;
        timers.delete(target);
      }, THEME_TRANSITION_MS),
    );
  }
  for (const [name, value] of Object.entries(themeVariables(theme))) target.style.setProperty(name, value);
  target.style.colorScheme = luminance(theme.colors.bg) < 0.4 ? 'dark' : 'light';
  target.dataset.theme = theme.id;
}
