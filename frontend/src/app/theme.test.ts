import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// theme.css (console) and wall.css both import base.css after Tailwind.
const css = ['theme.css', 'base.css'].map((file) => readFileSync(resolve(__dirname, file), 'utf8')).join('\n');

describe('theme (tokens from docs/03-design.md)', () => {
  it.each([
    ['--bg', '#0b0e13'],
    ['--s1', '#11151c'],
    ['--s2', '#171c25'],
    ['--s3', '#202734'],
    ['--line', '#242b37'],
    ['--text', '#e7ebf2'],
    ['--muted', '#9ba5b6'],
    ['--dim', '#677184'],
    ['--ok', '#3fd38f'],
    ['--warn', '#f3b640'],
    ['--down', '#ff5a6a'],
    ['--info', '#6e9bff'],
    ['--accent', '#6e9bff'],
  ])('defines %s = %s', (token, value) => {
    expect(css).toMatch(new RegExp(`${token}:\\s*${value}`, 'i'));
  });

  it('uses a fluid base on html', () => {
    expect(css).toContain('clamp(12px, .7vw + .45vh, 36px)');
  });

  it('turns animations off with prefers-reduced-motion', () => {
    expect(css).toContain('prefers-reduced-motion: reduce');
  });

  it('uses tabular numbers in mono fonts', () => {
    expect(css).toContain('tabular-nums');
  });

  it('exposes the colors to Tailwind via @theme', () => {
    expect(css).toMatch(/@theme[\s\S]*--color-down:\s*var\(--down\)/);
  });

  it('FE-60: accent is a real Tailwind color (bg-accent, text-accent) with a readable foreground', () => {
    expect(css).toMatch(/@theme[\s\S]*--color-accent:\s*var\(--accent\)/);
    expect(css).toMatch(/@theme[\s\S]*--color-on-accent:\s*var\(--on-accent\)/);
  });

  it.each([
    ['--text-xs', '0.75rem'],
    ['--text-sm', '0.8125rem'],
    ['--text-base', '0.875rem'],
    ['--text-md', '1rem'],
    ['--text-lg', '1.25rem'],
    ['--text-xl', '1.625rem'],
    ['--text-2xl', '2.25rem'],
    ['--radius-sm', '6px'],
    ['--radius-md', '10px'],
    ['--radius-lg', '14px'],
  ])('FE-60: @theme scale token %s = %s', (token, value) => {
    expect(css).toMatch(new RegExp(`@theme[\\s\\S]*${token}:\\s*${value};`));
  });

  it('FE-60: Archivo display, Geist body and Geist Mono data fonts are bundled', () => {
    expect(css).toContain('@fontsource-variable/archivo');
    expect(css).toContain('@fontsource-variable/geist/');
    expect(css).toContain('@fontsource-variable/geist-mono');
    expect(css).toMatch(/--font-display:\s*'Archivo Variable'/);
    expect(css).toMatch(/--font-sans:\s*'Geist Variable'/);
  });

  it('FE-60: focus ring uses the accent', () => {
    expect(css).toMatch(/:focus-visible\s*\{\s*outline:\s*2px solid var\(--accent\)/);
  });
});
