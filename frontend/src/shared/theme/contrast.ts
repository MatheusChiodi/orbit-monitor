import { msg, type Message } from '@/shared/i18n/message';
import { CVD_KINDS, deltaE, fromOkLab, luminance, mix, normalizeHex, simulateCvd, toOkLab, type CvdKind } from './color';
import { tokenValue } from './paths';
import {
  STATUS_TOKENS,
  SYNTAX_TOKENS,
  type ColorToken,
  type CvdTarget,
  type OrbitTheme,
  type ThemeColors,
} from './types';

/**
 * FE-02 contrast guard. Text pairs follow WCAG 2.x (4.5:1 body, 3:1 large labels and graphics);
 * status colors must stay apart in OKLab for typical vision and for simulated dichromacy.
 */
export const BODY_RATIO = 4.5;
export const LARGE_RATIO = 3;
/** ΔE_OK between any two status colors for typical vision. */
export const STATUS_DISTANCE = 0.12;
/** Floor under every simulated deficiency; states also always carry a text label and an icon. */
export const STATUS_DISTANCE_CVD = 0.04;
/** Margin a color-blind safe theme must keep under its target deficiency. */
export const STATUS_DISTANCE_TARGET = 0.1;
/** ΔE_OK between chart series. */
export const CHART_DISTANCE = 0.06;

export type IssueKind = 'body' | 'large' | 'indistinguishable';

export interface ContrastIssue {
  kind: IssueKind;
  foreground: string;
  background: string;
  required: number;
  actual: number;
  cvd?: CvdKind;
  message: Message;
  /** Closest value that passes, for contrast issues. */
  suggestion?: string;
}

export interface CheckOptions {
  cvdTarget?: CvdTarget;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const round = (n: number, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;

interface ContrastRule {
  foreground: ColorToken;
  backgrounds: readonly ColorToken[];
  kind: 'body' | 'large';
}

const COLOR_RULES: readonly ContrastRule[] = [
  { foreground: 'text', backgrounds: ['bg', 's1', 's2', 's3'], kind: 'body' },
  { foreground: 'muted', backgrounds: ['bg', 's1', 's2'], kind: 'body' },
  { foreground: 'dim', backgrounds: ['bg', 's1'], kind: 'large' },
  ...STATUS_TOKENS.map((t) => ({ foreground: t, backgrounds: ['bg', 's1', 's2'] as const, kind: 'large' as const })),
  { foreground: 'accent', backgrounds: ['bg', 's1'], kind: 'large' },
];

const required = (kind: 'body' | 'large') => (kind === 'body' ? BODY_RATIO : LARGE_RATIO);

function contrastIssue(fgName: string, fg: string, bgName: string, bg: string, kind: 'body' | 'large'): ContrastIssue | null {
  const need = required(kind);
  const ratio = contrastRatio(fg, bg);
  if (ratio >= need) return null;
  const actual = round(ratio);
  return {
    kind,
    foreground: fgName,
    background: bgName,
    required: need,
    actual,
    message: msg(`theme.contrast.${kind}`, { foreground: fgName, background: bgName, ratio: actual }),
    suggestion: suggestReadable(fg, bg, need),
  };
}

function distance(a: string, b: string, cvd?: CvdKind): number {
  return cvd ? deltaE(simulateCvd(a, cvd), simulateCvd(b, cvd)) : deltaE(a, b);
}

function separationIssues(
  entries: readonly (readonly [string, string])[],
  thresholds: (cvd: CvdKind | undefined) => number,
): ContrastIssue[] {
  const issues: ContrastIssue[] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [aName, a] = entries[i]!;
      const [bName, b] = entries[j]!;
      for (const cvd of [undefined, ...CVD_KINDS]) {
        const need = thresholds(cvd);
        const actual = distance(a, b, cvd);
        if (actual >= need) continue;
        issues.push({
          kind: 'indistinguishable',
          foreground: bName,
          background: aName,
          required: need,
          actual: round(actual, 3),
          ...(cvd ? { cvd } : {}),
          message: cvd
            ? msg('theme.contrast.indistinguishableCvd', { foreground: bName, background: aName, cvd })
            : msg('theme.contrast.indistinguishable', { foreground: bName, background: aName }),
        });
        break;
      }
    }
  }
  return issues;
}

/** Checks the color tokens; returns an empty list when the theme passes. */
export function checkTheme(colors: ThemeColors, options: CheckOptions = {}): ContrastIssue[] {
  const issues: ContrastIssue[] = [];
  for (const rule of COLOR_RULES) {
    for (const bg of rule.backgrounds) {
      const issue = contrastIssue(rule.foreground, colors[rule.foreground], bg, colors[bg], rule.kind);
      if (issue) issues.push(issue);
    }
  }
  const order: readonly ColorToken[] = ['down', 'warn', 'ok', 'info'];
  issues.push(
    ...separationIssues(
      order.map((t) => [t, colors[t]] as const),
      (cvd) => {
        if (!cvd) return STATUS_DISTANCE;
        return cvd === options.cvdTarget ? STATUS_DISTANCE_TARGET : STATUS_DISTANCE_CVD;
      },
    ),
  );
  return issues;
}

type Palette = Pick<OrbitTheme, 'colors' | 'chart' | 'syntax' | 'cvdTarget'>;

/** Full check: color tokens, chart series (3:1 on panels, mutually distinct) and SQL syntax (on `s1`). */
export function checkPalette(theme: Palette): ContrastIssue[] {
  const { colors } = theme;
  const issues = checkTheme(colors, theme.cvdTarget ? { cvdTarget: theme.cvdTarget } : {});
  theme.chart.forEach((color, i) => {
    const issue = contrastIssue(`chart.${i}`, color, 's1', colors.s1, 'large');
    if (issue) issues.push(issue);
  });
  issues.push(...separationIssues(theme.chart.map((c, i) => [`chart.${i}`, c] as const), (cvd) => (cvd ? 0 : CHART_DISTANCE)));
  for (const token of SYNTAX_TOKENS) {
    const kind = token === 'comment' ? 'large' : 'body';
    const issue = contrastIssue(`syntax.${token}`, theme.syntax[token], 's1', colors.s1, kind);
    if (issue) issues.push(issue);
  }
  return issues;
}

/** Moves `color` lighter or darker (keeping its hue) until it reaches `ratio` against `background`. */
export function suggestReadable(color: string, background: string, ratio: number): string {
  if (contrastRatio(color, background) >= ratio) return color;
  const lab = toOkLab(color);
  const towardLight = luminance(background) < 0.18;
  const attempt = (light: boolean): string | null => {
    let lo = 0;
    let hi = light ? 1 - lab.L : lab.L;
    const candidate = (d: number) => fromOkLab({ L: lab.L + (light ? d : -d), a: lab.a, b: lab.b });
    if (contrastRatio(candidate(hi), background) < ratio) return null;
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2;
      if (contrastRatio(candidate(mid), background) >= ratio) hi = mid;
      else lo = mid;
    }
    return candidate(hi);
  };
  const found = attempt(towardLight) ?? attempt(!towardLight);
  if (found) return found;
  // Hue cannot reach the ratio (e.g. mid-grey surface): fall back to the nearest extreme.
  const extreme = contrastRatio('#ffffff', background) > contrastRatio('#000000', background) ? '#ffffff' : '#000000';
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(mix(color, extreme, mid), background) >= ratio) hi = mid;
    else lo = mid;
  }
  return mix(color, extreme, hi);
}

/** Satisfies `ratio` against every background, fixing against the worst one until all pass. */
function readableOnAll(color: string, backgrounds: readonly string[], ratio: number): string {
  let value = color;
  for (let pass = 0; pass < 4; pass++) {
    const worst = backgrounds.reduce((w, bg) => (contrastRatio(value, bg) < contrastRatio(value, w) ? bg : w));
    if (contrastRatio(value, worst) >= ratio) return value;
    value = suggestReadable(value, worst, ratio + 0.02);
  }
  return value;
}

const L_STEPS = [0, ...Array.from({ length: 20 }, (_, i) => (i + 1) * 0.015).flatMap((d) => [d, -d])];
const HUE_STEPS = [0, 8, -8, 16, -16, 24, -24, 32, -32];

function rotate(color: string, deltaL: number, degrees: number): string {
  const lab = toOkLab(color);
  const rad = (degrees * Math.PI) / 180;
  return fromOkLab({
    L: Math.min(1, Math.max(0, lab.L + deltaL)),
    a: lab.a * Math.cos(rad) - lab.b * Math.sin(rad),
    b: lab.a * Math.sin(rad) + lab.b * Math.cos(rad),
  });
}

/** Moves one status color of each clashing pair by the smallest perceptual change that clears it. */
function separateStatus(colors: ThemeColors, options: CheckOptions): ThemeColors {
  let current = colors;
  for (let round = 0; round < 12; round++) {
    const issues = checkTheme(current, options);
    const pair = issues.find((i) => i.kind === 'indistinguishable');
    if (!pair) return current;
    let best: { colors: ThemeColors; cost: number } | null = null;
    for (const token of [pair.foreground, pair.background] as ColorToken[]) {
      for (const hue of HUE_STEPS) {
        for (const step of L_STEPS) {
          if (hue === 0 && step === 0) continue;
          const value = rotate(current[token], step, hue);
          const cost = deltaE(value, colors[token]);
          if (best && cost >= best.cost) continue;
          const candidate = { ...current, [token]: value };
          const after = checkTheme(candidate, options);
          if (after.length < issues.length && !after.some((i) => i.foreground === token || i.background === token)) {
            best = { colors: candidate, cost };
          }
        }
      }
    }
    if (!best) return current;
    current = best.colors;
  }
  return current;
}

export interface FixResult<T> {
  theme: T;
  /** Token paths (`text`, `chart.2`, `syntax.comment`) whose value changed. */
  adjusted: string[];
}

/** Applies the guard's suggestions until the palette passes; surfaces are never changed. */
export function fixTheme<T extends Palette>(theme: T): FixResult<T> {
  const options: CheckOptions = theme.cvdTarget ? { cvdTarget: theme.cvdTarget } : {};
  let colors = { ...theme.colors };
  for (let pass = 0; pass < 3; pass++) {
    for (const rule of COLOR_RULES) {
      colors[rule.foreground] = readableOnAll(colors[rule.foreground], rule.backgrounds.map((b) => colors[b]), required(rule.kind));
    }
    colors = separateStatus(colors, options);
    if (checkTheme(colors, options).length === 0) break;
  }
  const chart = theme.chart.map((c) => readableOnAll(c, [colors.s1], LARGE_RATIO)) as unknown as T['chart'];
  const syntax = { ...theme.syntax };
  for (const token of SYNTAX_TOKENS) {
    syntax[token] = readableOnAll(syntax[token], [colors.s1], token === 'comment' ? LARGE_RATIO : BODY_RATIO);
  }

  const adjusted: string[] = [];
  const same = (a: string, b: string) => normalizeHex(a) === normalizeHex(b);
  for (const token of Object.keys(colors) as ColorToken[]) if (!same(colors[token], theme.colors[token])) adjusted.push(token);
  chart.forEach((c, i) => {
    if (!same(c, theme.chart[i]!)) adjusted.push(`chart.${i}`);
  });
  for (const token of SYNTAX_TOKENS) if (!same(syntax[token], theme.syntax[token])) adjusted.push(`syntax.${token}`);
  if (adjusted.length === 0) return { theme, adjusted };
  return { theme: { ...theme, colors, chart, syntax }, adjusted };
}

/** Value the guard would use for one token path (`text`, `chart.2`, `syntax.comment`). */
export function suggestToken<T extends Palette>(theme: T, path: string): string | undefined {
  return tokenValue(fixTheme(theme).theme as unknown as OrbitTheme, path);
}
