import { describe, expect, it } from 'vitest';
import { EMPTY_LAYERS, resolveSetting, type CustomizationLayers } from './resolve';

const layers: CustomizationLayers = {
  ...EMPTY_LAYERS,
  workspace: { 'card.monitor.variant': 'detailed', 'card.monitor.clickAction': 'expand' },
  device: { 'card.monitor.variant': 'compact' },
  layouts: { noc: { 'card.monitor.variant': 'regular' } },
  instances: { 'card.monitor:mon_1': { 'card.monitor.variant': 'detailed' } },
};

describe('resolveSetting', () => {
  it('falls back to the product default', () => {
    expect(resolveSetting('card.monitor.hover', EMPTY_LAYERS)).toEqual({ value: 'highlight', source: 'default' });
  });

  it('applies instance > layout > device > workspace > default', () => {
    expect(resolveSetting('card.monitor.variant', layers)).toEqual({ value: 'compact', source: 'device' });
    expect(resolveSetting('card.monitor.variant', layers, { layoutId: 'noc' })).toEqual({ value: 'regular', source: 'layout' });
    expect(resolveSetting('card.monitor.variant', layers, { layoutId: 'noc', instanceId: 'card.monitor:mon_1' })).toEqual({
      value: 'detailed',
      source: 'instance',
    });
    expect(resolveSetting('card.monitor.clickAction', layers, { layoutId: 'noc' })).toEqual({ value: 'expand', source: 'workspace' });
  });

  it('puts the live preview draft above every scope', () => {
    const draft = { 'card.monitor.variant': 'regular' };
    expect(resolveSetting('card.monitor.variant', { ...layers, draft }, { instanceId: 'card.monitor:mon_1' }).source).toBe('draft');
  });

  it('ignores values that a scope may not hold or that fail validation', () => {
    const odd: CustomizationLayers = {
      ...EMPTY_LAYERS,
      device: { 'card.monitor.title': 'Device title', 'card.monitor.variant': 'gigantic' },
    };
    expect(resolveSetting('card.monitor.title', odd)).toEqual({ value: '', source: 'default' });
    expect(resolveSetting('card.monitor.variant', odd).source).toBe('default');
  });

  it('uses bridged device preferences as the device value and workspace preferences as the default', () => {
    const bridged: CustomizationLayers = { ...EMPTY_LAYERS, bridgedDevice: { 'density.level': 'compact' }, bridgedDefaults: { 'density.level': 'spacious' } };
    expect(resolveSetting('density.level', bridged)).toEqual({ value: 'compact', source: 'device' });
    expect(resolveSetting('density.level', { ...bridged, bridgedDevice: {} })).toEqual({ value: 'spacious', source: 'default' });
    expect(resolveSetting('density.level', { ...bridged, workspace: { 'density.level': 'comfortable' }, bridgedDevice: {} }).source).toBe('workspace');
  });

  it('throws on an unknown id so typos fail fast in tests', () => {
    expect(() => resolveSetting('nope.nothing', EMPTY_LAYERS)).toThrow(/Unknown setting/);
  });
});
