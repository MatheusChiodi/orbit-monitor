import { describe, expect, it } from 'vitest';
import {
  deltaE,
  isHexColor,
  luminance,
  mix,
  normalizeHex,
  parseHex,
  simulateCvd,
  toHex,
  withAlpha,
} from './color';

describe('color utilities', () => {
  it('accepts #rgb, #rrggbb and #rrggbbaa only', () => {
    expect(isHexColor('#fff')).toBe(true);
    expect(isHexColor('#0d1117')).toBe(true);
    expect(isHexColor('#ffffff12')).toBe(true);
    expect(isHexColor('red')).toBe(false);
    expect(isHexColor('#ggg')).toBe(false);
    expect(isHexColor('url(javascript:alert(1))')).toBe(false);
    expect(isHexColor(42)).toBe(false);
  });

  it('normalizes to lowercase 6 or 8 digits', () => {
    expect(normalizeHex('#FFF')).toBe('#ffffff');
    expect(normalizeHex('#0D1117')).toBe('#0d1117');
    expect(normalizeHex('#FFFFFF12')).toBe('#ffffff12');
  });

  it('parses channels and alpha', () => {
    expect(parseHex('#ff8000')).toEqual({ r: 255, g: 128, b: 0, a: 1 });
    expect(parseHex('#00000080').a).toBeCloseTo(0.5, 2);
    expect(() => parseHex('blue')).toThrow();
  });

  it('round-trips through toHex', () => {
    expect(toHex(parseHex('#3b9eff'))).toBe('#3b9eff');
  });

  it('computes WCAG relative luminance', () => {
    expect(luminance('#ffffff')).toBeCloseTo(1, 5);
    expect(luminance('#000000')).toBeCloseTo(0, 5);
    expect(luminance('#808080')).toBeCloseTo(0.2159, 3);
  });

  it('mixes two colors in sRGB', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#000000', '#ffffff', 0)).toBe('#000000');
  });

  it('composites a translucent color over a background', () => {
    expect(withAlpha('#ffffff80', '#000000')).toBe('#808080');
    expect(withAlpha('#3b9eff', '#000000')).toBe('#3b9eff');
  });

  it('measures perceptual distance in OKLab', () => {
    expect(deltaE('#22c55e', '#22c55e')).toBeCloseTo(0, 5);
    expect(deltaE('#000000', '#ffffff')).toBeCloseTo(1, 2);
    expect(deltaE('#ff3b4f', '#f5a524')).toBeGreaterThan(0.1);
  });

  it('simulates dichromacy (Machado 2009, severity 1) in linear RGB', () => {
    // Red and green collapse for red-green deficiencies and stay apart for tritanopia.
    const red = '#d62728';
    const green = '#2ca02c';
    expect(deltaE(simulateCvd(red, 'deuteranopia'), simulateCvd(green, 'deuteranopia'))).toBeLessThan(
      deltaE(red, green) / 2,
    );
    expect(deltaE(simulateCvd(red, 'tritanopia'), simulateCvd(green, 'tritanopia'))).toBeGreaterThan(0.15);
    expect(simulateCvd('#ffffff', 'protanopia')).toBe('#ffffff');
    expect(simulateCvd('#000000', 'tritanopia')).toBe('#000000');
  });
});
