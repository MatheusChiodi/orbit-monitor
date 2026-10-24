import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'customization.css'), 'utf8');
/** The token-based rules, without the legacy block kept for markup still on arbitrary classes. */
const current = css.slice(0, css.indexOf('Legacy radius hooks'));

describe('FE-56 / FE-60 customization hooks', () => {
  it.each([
    ['radius', /html\[data-radius='sharp'\]\s*\{[^}]*--radius-sm:/],
    ['radius round', /html\[data-radius='round'\]\s*\{[^}]*--radius-md:/],
    ['surfaces', /html\[data-surfaces='flat'\]\s*\{[^}]*--surface-2:\s*var\(--s1\)/],
    ['shadows', /html\[data-shadows='on'\]\s*\{\s*--panel-shadow:/],
    ['panel padding', /html\[data-panel-padding='tight'\]\s*\{\s*--panel-padding:/],
    ['border', /html\[data-border='thick'\] :where\(\.border\)\s*\{\s*border-width:\s*2px/],
  ])('%s is driven by a token or a stable hook', (_, rule) => {
    expect(current).toMatch(rule);
  });

  it('the token rules never select arbitrary Tailwind class names', () => {
    expect(current).not.toMatch(/rounded-\[|p-\\?\[|\.bg-s[23]/);
  });

  it('console panels are never glass (theme.css); the wall can turn FE-52 glass off', () => {
    const console = readFileSync(resolve(__dirname, '../../app/theme.css'), 'utf8');
    expect(console).toMatch(/html\.console\[data-fx\] \.fx-glass/);
    expect(current).toMatch(/html\[data-glass='off'\]\[data-fx\] \.fx-glass/);
  });
});
