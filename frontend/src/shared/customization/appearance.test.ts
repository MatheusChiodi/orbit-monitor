import { afterEach, describe, expect, it } from 'vitest';
import { applyAppearance, appearanceFrom, clearAppearance } from './appearance';
import { EMPTY_LAYERS } from './resolve';

function root(): HTMLElement {
  return document.createElement('html');
}

afterEach(() => clearAppearance(document.documentElement));

describe('FE-56 appearance', () => {
  it('leaves the product look untouched when nothing is customized', () => {
    const el = root();
    applyAppearance(appearanceFrom(EMPTY_LAYERS), el);
    expect(el.dataset.radius).toBeUndefined();
    expect(el.dataset.glass).toBeUndefined();
    expect(el.style.getPropertyValue('--type-base')).toBe('');
    expect(el.style.getPropertyValue('--font-sans')).toBe('');
  });

  it('maps typography to CSS variables, never below the 13 px floor', () => {
    const el = root();
    const look = appearanceFrom({
      ...EMPTY_LAYERS,
      device: { 'typography.bodyFont': 'system-serif', 'typography.baseSize': 9, 'typography.scale': 1.2, 'typography.letterSpacing': 'wide', 'typography.weight': 'medium', 'typography.monoValues': false },
    });
    applyAppearance(look, el);
    expect(el.style.getPropertyValue('--font-sans')).toContain('serif');
    expect(el.style.getPropertyValue('--type-base')).toBe('13px');
    expect(el.style.getPropertyValue('--type-scale')).toBe('1.2');
    expect(el.dataset.typeBase).toBe('true');
    expect(el.dataset.typeScale).toBe('true');
    expect(el.dataset.letterSpacing).toBe('wide');
    expect(el.dataset.weight).toBe('medium');
    expect(el.dataset.monoValues).toBe('off');
  });

  it('maps shape and surface choices to data attributes', () => {
    const el = root();
    applyAppearance(
      appearanceFrom({ ...EMPTY_LAYERS, workspace: { 'shape.radius': 'round', 'shape.borderWidth': 'thick', 'shape.glass': false, 'shape.surfaces': 'flat', 'shape.shadows': true, 'density.panelPadding': 'tight' } }),
      el,
    );
    expect(el.dataset).toMatchObject({ radius: 'round', border: 'thick', glass: 'off', surfaces: 'flat', shadows: 'on', panelPadding: 'tight' });
  });

  it('applies the resolved density through FE-07', () => {
    const el = root();
    applyAppearance(appearanceFrom({ ...EMPTY_LAYERS, layouts: { noc: { 'density.level': 'spacious' } } }, 'noc'), el);
    expect(el.dataset.density).toBe('spacious');
    expect(el.style.getPropertyValue('--density-scale')).toBe('1.15');
  });

  it('removes what a previous call set when a value returns to the default', () => {
    const el = root();
    applyAppearance(appearanceFrom({ ...EMPTY_LAYERS, device: { 'shape.glass': false, 'typography.baseSize': 18 } }), el);
    applyAppearance(appearanceFrom(EMPTY_LAYERS), el);
    expect(el.dataset.glass).toBeUndefined();
    expect(el.style.getPropertyValue('--type-base')).toBe('');
  });
});
