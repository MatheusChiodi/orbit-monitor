import { afterEach, describe, expect, it } from 'vitest';
import { DENSITIES, applyDensity, densityFontSize } from './density';

afterEach(() => {
  delete document.documentElement.dataset.density;
  document.documentElement.style.removeProperty('--density-scale');
});

describe('FE-07 density', () => {
  it('compact, comfortable (default) and spacious', () => {
    expect(DENSITIES).toEqual(['compact', 'comfortable', 'spacious']);
  });

  it('console font size grows with density and stays within 15–17 px (16 px root: the rem type scale reads as designed)', () => {
    expect(densityFontSize('compact')).toBeLessThan(densityFontSize('comfortable'));
    expect(densityFontSize('comfortable')).toBe(16);
    expect(densityFontSize('spacious')).toBeLessThanOrEqual(17);
    expect(densityFontSize('compact')).toBeGreaterThanOrEqual(15);
  });

  it('applyDensity marks the console root and sets the spacing scale', () => {
    applyDensity('compact');
    expect(document.documentElement.dataset.density).toBe('compact');
    expect(document.documentElement.style.getPropertyValue('--density-scale')).toBe('0.85');
  });

  it('buttons keep at least 2.2 rem height in every density (accessibility)', () => {
    for (const d of DENSITIES) {
      applyDensity(d);
      expect(Number(document.documentElement.style.getPropertyValue('--density-scale')) * 2.2).toBeGreaterThanOrEqual(1.85);
    }
  });
});
