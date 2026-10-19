import { useEffect, useState } from 'react';

/** Colors every FX layer draws with. They come from the theme (applyTheme writes them on <html>). */
export interface FxPalette {
  from: string;
  to: string;
  glow: string;
  info: string;
  ok: string;
  warn: string;
  down: string;
  muted: string;
  text: string;
  bg: string;
}

/** Orbit Dark, used when no theme variable is set (tests, very first paint). */
const ORBIT_DARK: FxPalette = {
  from: '#3b9eff',
  to: '#22c55e',
  glow: '#3b9eff',
  info: '#3b9eff',
  ok: '#22c55e',
  warn: '#f5a524',
  down: '#ff3b4f',
  muted: '#8b96a6',
  text: '#eef2f7',
  bg: '#07090d',
};

export function readFxPalette(root: HTMLElement = document.documentElement): FxPalette {
  const style = getComputedStyle(root);
  const read = (name: string) => style.getPropertyValue(name).trim();
  const info = read('--info') || ORBIT_DARK.info;
  const ok = read('--ok') || ORBIT_DARK.ok;
  const from = read('--fx-from') || info;
  return {
    from,
    to: read('--fx-to') || ok,
    glow: read('--fx-glow') || from,
    info,
    ok,
    warn: read('--warn') || ORBIT_DARK.warn,
    down: read('--down') || ORBIT_DARK.down,
    muted: read('--muted') || ORBIT_DARK.muted,
    text: read('--text') || ORBIT_DARK.text,
    bg: read('--bg') || ORBIT_DARK.bg,
  };
}

const same = (a: FxPalette, b: FxPalette) => (Object.keys(a) as (keyof FxPalette)[]).every((key) => a[key] === b[key]);

/** Theme palette that follows theme switches (the theme rewrites style / class / data-* on <html>). */
export function useFxPalette(): FxPalette {
  const [palette, setPalette] = useState(readFxPalette);
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      const next = readFxPalette(root);
      setPalette((current) => (same(current, next) ? current : next));
    });
    observer.observe(root, { attributes: true, attributeFilter: ['style', 'class', 'data-theme'] });
    return () => observer.disconnect();
  }, []);
  return palette;
}
