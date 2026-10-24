import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'customization.css'), 'utf8');
/** The token-based rules, without the legacy block kept for markup still on arbitrary classes. */
const current = css.slice(0, css.indexOf('Legacy hooks'));

describe('FE-56 / FE-60 customization hooks', () => {
  it.each([
    ['radius', /html\[data-radius='sharp'\]\s*\{[^}]*--radius-sm:/],
    ['radius round', /html\[data-radius='round'\]\s*\{[^}]*--radius-md:/],
    ['surfaces', /html\[data-surfaces='flat'\]\s*\{[^}]*--surface-2:\s*var\(--s1\)/],
    ['shadows', /html\[data-shadows='on'\]\s*\{\s*--panel-shadow:/],
    ['panel padding', /html\[data-panel-padding='tight'\]\s*\{\s*--panel-padding:/],
    ['border', /html\[data-border='thick'\]\s*\{\s*--control-border-width:\s*2px/],
  ])('%s changes a token', (_, rule) => {
    expect(current).toMatch(rule);
  });

  it('the token rules never select arbitrary Tailwind class names', () => {
    expect(current).not.toMatch(/rounded-\[|p-\\?\[|\.bg-s[23]/);
  });

  it('console panels are never glass; the wall keeps FE-52 glass', () => {
    expect(current).toMatch(/html\.console\[data-fx\] \.fx-glass/);
  });
});
