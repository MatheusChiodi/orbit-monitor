/**
 * Animated background: faint orbital ellipses with slow particles travelling along them.
 * Pure geometry + a canvas 2D renderer; no text, no data, nothing above the luminance budget.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Orbit {
  rx: number;
  ry: number;
  alpha: number;
}

export interface Particle {
  orbit: number;
  angle: number;
  /** Radians per millisecond (signed). */
  speed: number;
  size: number;
  alpha: number;
  accent: boolean;
}

export interface OrbitFieldModel {
  width: number;
  height: number;
  cx: number;
  cy: number;
  rotation: number;
  orbits: Orbit[];
  particles: Particle[];
}

export interface OrbitColors {
  line: Rgb | null;
  accent: Rgb | null;
}

/** docs/03-design.md §4.2: the background changes luminance by at most 6%. */
export const MAX_LUMINANCE_DELTA = 0.06;

const FALLBACK_LINE: Rgb = { r: 59, g: 158, b: 255 };
const FALLBACK_ACCENT: Rgb = { r: 34, g: 197, b: 94 };

export function parseColor(value: string): Rgb | null {
  const text = value.trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(text);
  if (hex?.[1]) {
    const n = Number.parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(text);
  if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
  return null;
}

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance (0..1). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Largest alpha (≤ `alpha`) at which `color` over a black background stays within the budget. */
export function capAlpha(color: Rgb, alpha: number): number {
  const luminance = relativeLuminance(color);
  if (luminance === 0) return alpha;
  return Math.min(alpha, MAX_LUMINANCE_DELTA / luminance);
}

function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface OrbitFieldOptions {
  width: number;
  height: number;
  /** 0..1 from the FX level; scales particle density. */
  intensity: number;
  seed?: number;
}

const ORBITS = 6;

export function createOrbitField({ width, height, intensity, seed = 42 }: OrbitFieldOptions): OrbitFieldModel {
  const rand = random(seed);
  const diagonal = Math.hypot(width, height);
  const orbits: Orbit[] = Array.from({ length: ORBITS }, (_, i) => {
    const rx = diagonal * (0.16 + i * 0.13);
    return { rx, ry: rx * 0.36, alpha: 0.075 - i * 0.008 };
  });
  const count = Math.round(60 * Math.max(0, Math.min(1, intensity)) ** 1.5);
  const particles: Particle[] = Array.from({ length: count }, (_, i) => {
    const orbit = Math.floor(rand() * ORBITS);
    const direction = orbit % 2 === 0 ? 1 : -1;
    return {
      orbit,
      angle: rand() * Math.PI * 2,
      speed: direction * (0.000015 + rand() * 0.00004) / Math.sqrt(orbit + 1),
      size: 0.6 + rand() * 1.1,
      alpha: 0.18 + rand() * 0.32,
      accent: i % 5 === 0,
    };
  });
  return { width, height, cx: width * 0.3, cy: height * 0.4, rotation: -0.3, orbits, particles };
}

export function stepOrbitField(field: OrbitFieldModel, dtMs: number): void {
  for (const particle of field.particles) particle.angle += particle.speed * dtMs;
}

function point(field: OrbitFieldModel, orbit: Orbit, angle: number): { x: number; y: number } {
  const cos = Math.cos(field.rotation);
  const sin = Math.sin(field.rotation);
  const ex = orbit.rx * Math.cos(angle);
  const ey = orbit.ry * Math.sin(angle);
  return { x: field.cx + ex * cos - ey * sin, y: field.cy + ex * sin + ey * cos };
}

const css = ({ r, g, b }: Rgb) => `rgb(${r}, ${g}, ${b})`;
const TRAIL = 5;

export function drawOrbitField(ctx: CanvasRenderingContext2D, field: OrbitFieldModel, colors: OrbitColors): void {
  const line = colors.line ?? FALLBACK_LINE;
  const accent = colors.accent ?? FALLBACK_ACCENT;
  // One cap for both colors keeps every mark inside the budget whichever color it uses.
  const brightest = relativeLuminance(line) >= relativeLuminance(accent) ? line : accent;
  ctx.clearRect(0, 0, field.width, field.height);
  ctx.lineWidth = 1;

  for (const orbit of field.orbits) {
    ctx.beginPath();
    ctx.ellipse(field.cx, field.cy, orbit.rx, orbit.ry, field.rotation, 0, Math.PI * 2);
    ctx.strokeStyle = css(line);
    ctx.globalAlpha = capAlpha(brightest, orbit.alpha);
    ctx.stroke();
  }

  for (const particle of field.particles) {
    const orbit = field.orbits[particle.orbit];
    if (!orbit) continue;
    // Particles on the near half of the orbit read slightly brighter: cheap depth.
    const depth = 0.55 + 0.45 * Math.max(0, Math.sin(particle.angle));
    ctx.fillStyle = css(particle.accent ? accent : line);
    for (let t = 0; t < TRAIL; t++) {
      const { x, y } = point(field, orbit, particle.angle - Math.sign(particle.speed) * t * 0.012);
      ctx.beginPath();
      ctx.arc(x, y, particle.size * depth * (1 - t / (TRAIL + 1)), 0, Math.PI * 2);
      ctx.globalAlpha = capAlpha(brightest, particle.alpha * depth * (1 - t / TRAIL));
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
