import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'theme.css'), 'utf8');

describe('tema (tokens de 03-design.md)', () => {
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
  ])('define %s = %s', (token, value) => {
    expect(css).toMatch(new RegExp(`${token}:\\s*${value}`, 'i'));
  });

  it('usa base fluida no html', () => {
    expect(css).toContain('clamp(12px, .7vw + .45vh, 36px)');
  });

  it('desliga animações com prefers-reduced-motion', () => {
    expect(css).toContain('prefers-reduced-motion: reduce');
  });

  it('usa números tabulares nas fontes mono', () => {
    expect(css).toContain('tabular-nums');
  });

  it('expõe as cores ao Tailwind via @theme', () => {
    expect(css).toMatch(/@theme[\s\S]*--color-down:\s*var\(--down\)/);
  });
});
