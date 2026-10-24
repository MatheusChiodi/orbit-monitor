import { describe, expect, it } from 'vitest';
import { deltaE, simulateCvd } from './color';
import { checkPalette, checkTheme, contrastRatio, fixTheme, suggestReadable } from './contrast';
import { ORBIT_DARK } from './registry';

describe('FE-02 contrast guard', () => {
  it('computes the WCAG contrast ratio', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#eef2f7', '#0d1117')).toBeGreaterThan(4.5);
  });

  it('is symmetric and accepts 3-digit hex', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(contrastRatio('#000000', '#ffffff'), 5);
  });

  it('rejects invalid colors', () => {
    expect(() => contrastRatio('red', '#000000')).toThrow();
  });

  it('the default Orbit Dark theme passes every check', () => {
    expect(checkTheme(ORBIT_DARK.colors)).toEqual([]);
    expect(checkPalette(ORBIT_DARK)).toEqual([]);
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
    expect(issues).toContainEqual(
      expect.objectContaining({ kind: 'indistinguishable', foreground: 'warn', background: 'down' }),
    );
  });

  it('status colors must stay apart under simulated color-vision deficiencies', () => {
    // Red vs green: fine for typical vision, collapses for deuteranopia only.
    const issues = checkTheme({ ...ORBIT_DARK.colors, ok: '#43a609', down: '#f70d08' });
    expect(issues).toContainEqual(
      expect.objectContaining({ kind: 'indistinguishable', foreground: 'ok', background: 'down', cvd: 'deuteranopia' }),
    );
  });

  it('a color-blind safe theme needs a wider margin for its target deficiency', () => {
    const strict = checkTheme(ORBIT_DARK.colors, { cvdTarget: 'deuteranopia' });
    expect(strict.some((i) => i.kind === 'indistinguishable' && i.cvd === 'deuteranopia')).toBe(true);
  });

  it('every issue carries a translatable message', () => {
    const [issue] = checkTheme({ ...ORBIT_DARK.colors, muted: '#1a1f26' });
    expect(issue?.message.key).toMatch(/^theme\.contrast\./);
  });

  it('checks chart series and SQL syntax colors of a full palette', () => {
    const chart = [...ORBIT_DARK.chart] as unknown as typeof ORBIT_DARK.chart;
    const issues = checkPalette({
      ...ORBIT_DARK,
      chart: ['#10141a', ...chart.slice(1)] as unknown as typeof ORBIT_DARK.chart,
      syntax: { ...ORBIT_DARK.syntax, keyword: '#1c2230' },
    });
    expect(issues).toContainEqual(expect.objectContaining({ foreground: 'chart.0', required: 3 }));
    expect(issues).toContainEqual(expect.objectContaining({ foreground: 'syntax.keyword', required: 4.5 }));
  });

  it('suggests a fixed value that meets the ratio while keeping the hue', () => {
    const fixed = suggestReadable('#30363d', '#0d1117', 4.5);
    expect(fixed).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrastRatio(fixed, '#0d1117')).toBeGreaterThanOrEqual(4.5);
    const red = suggestReadable('#5a0d14', '#0d1117', 3);
    expect(contrastRatio(red, '#0d1117')).toBeGreaterThanOrEqual(3);
    expect(parseInt(red.slice(1, 3), 16)).toBeGreaterThan(parseInt(red.slice(3, 5), 16));
  });

  it('suggests darker values on light surfaces', () => {
    const fixed = suggestReadable('#f5a524', '#ffffff', 3);
    expect(contrastRatio(fixed, '#ffffff')).toBeGreaterThanOrEqual(3);
  });

  it('returns the same color when it already passes', () => {
    expect(suggestReadable('#eef2f7', '#0d1117', 4.5)).toBe('#eef2f7');
  });

  it('fixTheme repairs every issue and lists the tokens it changed', () => {
    const broken = {
      ...ORBIT_DARK,
      colors: { ...ORBIT_DARK.colors, text: '#30363d', warn: '#ff5c6b', dim: '#20252c' },
      syntax: { ...ORBIT_DARK.syntax, comment: '#151a20' },
    };
    const { theme, adjusted } = fixTheme(broken);
    expect(checkPalette(theme)).toEqual([]);
    expect(adjusted).toEqual(expect.arrayContaining(['text', 'dim', 'syntax.comment']));
    // One of the two colliding status colors moves apart.
    expect(adjusted.some((token) => token === 'warn' || token === 'down')).toBe(true);
    expect(adjusted).not.toContain('bg');
    expect(theme.colors.bg).toBe(ORBIT_DARK.colors.bg);
  });

  it('fixTheme leaves a passing theme untouched', () => {
    expect(fixTheme(ORBIT_DARK)).toEqual({ theme: ORBIT_DARK, adjusted: [] });
  });

  it('simulation helpers are consistent with the guard thresholds', () => {
    const d = deltaE(simulateCvd(ORBIT_DARK.colors.ok, 'protanopia'), simulateCvd(ORBIT_DARK.colors.warn, 'protanopia'));
    expect(d).toBeGreaterThan(0.04);
  });
});
