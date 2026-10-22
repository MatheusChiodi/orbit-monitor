import { afterEach, describe, expect, it } from 'vitest';
import { VIEWING_DISTANCES, applyViewingScale, fluidFontSize, viewingScale } from './viewingScale';

afterEach(() => {
  document.documentElement.style.removeProperty('--wall-scale');
});

describe('FE-08 viewing distance scale', () => {
  it('presets for 2 m, 3 m (default) and 5 m', () => {
    expect(VIEWING_DISTANCES).toEqual(['2m', '3m', '5m']);
    expect(viewingScale('3m')).toBe(1);
    expect(viewingScale('2m')).toBeLessThan(1);
    expect(viewingScale('5m')).toBeGreaterThan(1);
  });

  it('applies on top of the fluid base clamp(12px, .7vw + .45vh, 36px)', () => {
    expect(fluidFontSize('3m')).toBe('clamp(12px, calc((.7vw + .45vh) * 1), 36px)');
    expect(fluidFontSize('5m')).toMatch(/^clamp\(12px, calc\(\(\.7vw \+ \.45vh\) \* 1\.\d+\), 36px\)$/);
  });

  it('never goes below the 12 px minimum (legibility)', () => {
    for (const d of VIEWING_DISTANCES) expect(fluidFontSize(d).startsWith('clamp(12px')).toBe(true);
  });

  it('applyViewingScale sets --wall-scale on the wall root', () => {
    applyViewingScale('5m');
    expect(Number(document.documentElement.style.getPropertyValue('--wall-scale'))).toBeGreaterThan(1);
  });

  it('?scale=5m in the URL selects the preset; unknown values fall back to 3m', async () => {
    const { scaleFromSearch } = await import('./viewingScale');
    expect(scaleFromSearch('?scale=5m')).toBe('5m');
    expect(scaleFromSearch('?scale=10m')).toBe('3m');
  });
});
