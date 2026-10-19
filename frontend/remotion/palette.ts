/**
 * Colors for the compositions. Defaults mirror the theme tokens of docs/03-design.md §2; the console
 * passes the live CSS variables so custom themes recolor the intros too.
 */
export type Palette = {
  bg: string;
  surface: string;
  line: string;
  text: string;
  muted: string;
  blue: string;
  green: string;
  warn: string;
  down: string;
};

export const DEFAULT_PALETTE: Palette = {
  bg: '#07090d',
  surface: '#0d1117',
  line: 'rgba(255,255,255,0.13)',
  text: '#eef2f7',
  muted: '#8b96a6',
  blue: '#3b9eff',
  green: '#22c55e',
  warn: '#f5a524',
  down: '#ff3b4f',
};

export const FONT_DISPLAY = "'Inter Tight', 'Inter', system-ui, sans-serif";
export const FONT_SANS = "'Inter', system-ui, sans-serif";
export const FONT_MONO = "'Geist Mono', ui-monospace, monospace";

/** Same curve as the motion tokens (`ease.out`). */
export const EASE_OUT: [number, number, number, number] = [0.2, 0.8, 0.2, 1];
