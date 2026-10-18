import { describe, expect, it } from 'vitest';
import { checkTheme, contrastRatio, suggestReadable } from './contrast';
import { ORBIT_DARK } from './presets';

describe('FE-02 contrast guard', () => {
  it('computes the WCAG contrast ratio', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#eef2f7', '#0d1117')).toBeGreaterThan(4.5);
  });

  it('is symmetric and accepts 3-digit hex', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(contrastRatio('#000000', '#ffffff'), 5);
  });

  it('the default Orbit Dark theme passes every check', () => {
    expect(checkTheme(ORBIT_DARK.colors)).toEqual([]);
  });

  it('reports body text below 4.5:1 on a surface', () => {
    const issues = checkTheme({ ...ORBIT_DARK.colors, text: '#30363d' });
    expect(issues).toContainEqual(
      expect.objectContaining({ foreground: 'text', background: 's1', required: 4.5, kind: 'body' }),
    );
  });

  it('large labels (status colors) need 3:1', () => {
    const issues = checkTheme({ ...ORBIT_DARK.colors, down: '#3a1418' });
    expect(issues).toContainEqual(expect.objectContaining({ foreground: 'down', required: 3, kind: 'large' }));
  });

  it('status colors must be distinguishable from each other', () => {
    const issues = checkTheme({ ...ORBIT_DARK.colors, warn: ORBIT_DARK.colors.down });
    expect(issues).toContainEqual(expect.objectContaining({ kind: 'indistinguishable', foreground: 'warn', background: 'down' }));
  });

  it('every issue carries a translatable message', () => {
    const [issue] = checkTheme({ ...ORBIT_DARK.colors, muted: '#1a1f26' });
    expect(issue?.message.key).toMatch(/^theme\.contrast\./);
  });

  it('suggests a fixed value that meets the ratio while keeping the hue', () => {
    const fixed = suggestReadable('#30363d', '#0d1117', 4.5);
    expect(fixed).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrastRatio(fixed, '#0d1117')).toBeGreaterThanOrEqual(4.5);
  });

  it('returns the same color when it already passes', () => {
    expect(suggestReadable('#eef2f7', '#0d1117', 4.5)).toBe('#eef2f7');
  });

  it('rejects invalid colors', () => {
    expect(() => contrastRatio('red', '#000000')).toThrow();
  });
});
