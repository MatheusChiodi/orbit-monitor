/**
 * Small, dependency-free color math for the theme system (FE-01..FE-05):
 * hex parsing, WCAG 2.x luminance, OKLab distance and color-vision-deficiency simulation.
 */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type CvdKind = 'protanopia' | 'deuteranopia' | 'tritanopia';
export const CVD_KINDS: readonly CvdKind[] = ['protanopia', 'deuteranopia', 'tritanopia'];

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Only `#rgb`, `#rrggbb` and `#rrggbbaa`: nothing that CSS could interpret as a URL or expression. */
export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value);
}

export function normalizeHex(hex: string): string {
  if (!isHexColor(hex)) throw new Error(`Invalid hex color: ${hex}`);
  const value = hex.toLowerCase();
  if (value.length === 4) return `#${[...value.slice(1)].map((c) => c + c).join('')}`;
  return value;
}

export function parseHex(hex: string): Rgba {
  const value = normalizeHex(hex);
  const channel = (i: number) => parseInt(value.slice(i, i + 2), 16);
  return { r: channel(1), g: channel(3), b: channel(5), a: value.length === 9 ? channel(7) / 255 : 1 };
}

const clamp255 = (n: number) => Math.min(255, Math.max(0, Math.round(n)));
const byte = (n: number) => clamp255(n).toString(16).padStart(2, '0');

export function toHex({ r, g, b, a }: Rgba): string {
  const rgb = `#${byte(r)}${byte(g)}${byte(b)}`;
  return a >= 1 ? rgb : `${rgb}${byte(a * 255)}`;
}

/** Blends a translucent color over an opaque background (borders such as `line` are translucent). */
export function withAlpha(color: string, background: string): string {
  const fg = parseHex(color);
  if (fg.a >= 1) return toHex(fg);
  const bg = parseHex(background);
  const over = (f: number, b: number) => f * fg.a + b * (1 - fg.a);
  return toHex({ r: over(fg.r, bg.r), g: over(fg.g, bg.g), b: over(fg.b, bg.b), a: 1 });
}

/** Linear interpolation in sRGB; `amount` 0 returns `from`, 1 returns `to`. */
export function mix(from: string, to: string, amount: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  const lerp = (x: number, y: number) => x + (y - x) * amount;
  return toHex({ r: lerp(a.r, b.r), g: lerp(a.g, b.g), b: lerp(a.b, b.b), a: 1 });
}

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number) => {
  const c = Math.min(1, Math.max(0, v));
  return 255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
};

function linear(hex: string): [number, number, number] {
  const { r, g, b } = parseHex(hex);
  return [toLinear(r), toLinear(g), toLinear(b)];
}

/** WCAG 2.x relative luminance of an opaque color. */
export function luminance(hex: string): number {
  const [r, g, b] = linear(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export interface OkLab {
  L: number;
  a: number;
  b: number;
}

/** Björn Ottosson's OKLab. */
export function toOkLab(hex: string): OkLab {
  const [r, g, b] = linear(hex);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** Inverse of `toOkLab`; out-of-gamut values are clipped per channel. */
export function fromOkLab({ L, a, b }: OkLab): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return toHex({
    r: fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    a: 1,
  });
}

/** Shifts OKLab lightness by `delta`, keeping the hue. */
export function shiftLightness(color: string, delta: number): string {
  const lab = toOkLab(color);
  return fromOkLab({ L: Math.min(1, Math.max(0, lab.L + delta)), a: lab.a, b: lab.b });
}

/** Euclidean distance in OKLab (ΔE_OK); 0 = identical, ~1 = black vs white. */
export function deltaE(x: string, y: string): number {
  const p = toOkLab(x);
  const q = toOkLab(y);
  return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
}

type Matrix = readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]];

/** Machado, Oliveira & Fernandes (2009), severity 1.0, applied to linear RGB. */
const MACHADO_2009: Record<CvdKind, Matrix> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

export function simulateCvd(hex: string, kind: CvdKind): string {
  const [r, g, b] = linear(hex);
  const [m0, m1, m2] = MACHADO_2009[kind];
  const row = (m: readonly [number, number, number]) => fromLinear(m[0] * r + m[1] * g + m[2] * b);
  return toHex({ r: row(m0), g: row(m1), b: row(m2), a: 1 });
}
