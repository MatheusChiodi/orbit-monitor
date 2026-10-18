import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'theme.css'), 'utf8');

describe('theme (tokens from docs/03-design.md)', () => {
  it.each([
    ['--bg', '#07090d'],
    ['--s1', '#0d1117'],
    ['--s2', '#121820'],
    ['--s3', '#182029'],
    ['--text', '#eef2f7'],
    ['--muted', '#8b96a6'],
    ['--dim', '#5a6575'],
    ['--ok', '#22c55e'],
    ['--warn', '#f5a524'],
    ['--down', '#ff3b4f'],
    ['--info', '#3b9eff'],
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
});
