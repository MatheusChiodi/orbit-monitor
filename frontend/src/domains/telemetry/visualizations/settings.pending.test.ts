import { describe, expect, it } from 'vitest';
import { applySettings, bandStatus, validateSettings } from './settings';

describe('FE-23 visualization settings (pure)', () => {
  const bands = [
    { to: 50, status: 'OK' as const },
    { from: 50, to: 200, status: 'WARN' as const },
    { from: 200, status: 'DOWN' as const },
  ];

  it('maps a value to its color band ("< 50" green, "50–200" amber, "> 200" red)', () => {
    expect(bandStatus(10, bands)).toBe('OK');
    expect(bandStatus(50, bands)).toBe('WARN');
    expect(bandStatus(349, bands)).toBe('DOWN');
    expect(bandStatus(10, [])).toBeNull();
  });

  it('validates bands, decimals and min/max', () => {
    expect(validateSettings({ bands, decimals: 2, min: 0, max: 100 })).toEqual([]);
    expect(validateSettings({ bands: [{ to: 100, status: 'OK' }, { from: 50, status: 'WARN' }] })).toEqual([{ key: 'viz.settings.errors.overlap' }]);
    expect(validateSettings({ decimals: 7 })).toEqual([{ key: 'viz.settings.errors.decimals' }]);
    expect(validateSettings({ min: 10, max: 1 })).toEqual([{ key: 'viz.settings.errors.minMax' }]);
  });

  it('formats with decimals, prefix and suffix per locale', () => {
    expect(applySettings(349, { decimals: 1, prefix: '#', suffix: ' items' }, 'en')).toBe('#349.0 items');
    expect(applySettings(349, { decimals: 1 }, 'pt-BR')).toBe('349,0');
  });

  it('never formats a card number in clear (PCI DSS)', () => {
    expect(applySettings('4111 1111 1111 1111', {}, 'en')).toBe('•••• •••• •••• 1111');
  });
});
