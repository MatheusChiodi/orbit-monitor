import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/client';
import { createPreferencesStore } from '@/shared/preferences/preferences';
import { fromEntries, type CustomizationApi } from './api';
import { DEVICE_CUSTOMIZATION_KEY, createCustomizationStore } from './store';

function fakeApi(overrides: Partial<CustomizationApi> = {}): CustomizationApi {
  return {
    load: vi.fn(async () => ({ ...fromEntries([]), workspace: { 'card.monitor.variant': 'detailed' } })),
    saveScope: vi.fn(async () => undefined),
    deleteEntry: vi.fn(async () => undefined),
    saveProfile: vi.fn(async () => undefined),
    loadTerminology: vi.fn(async () => ({ en: {}, 'pt-BR': {} })),
    saveTerminology: vi.fn(async () => undefined),
    ...overrides,
  };
}

beforeEach(() => localStorage.clear());

describe('customization store', () => {
  it('loads the workspace layers from the API', async () => {
    const store = createCustomizationStore({ api: fakeApi() });
    await store.getState().load();
    expect(store.getState().resolve('card.monitor.variant')).toEqual({ value: 'detailed', source: 'workspace' });
    expect(store.getState().loaded).toBe(true);
  });

  it('keeps device values in browser storage only, sanitized', () => {
    const api = fakeApi();
    const store = createCustomizationStore({ api });
    store.getState().setValue('device', 'card.monitor.variant', 'compact');
    store.getState().setValue('device', 'card.monitor.variant', 'enormous');
    expect(JSON.parse(localStorage.getItem(DEVICE_CUSTOMIZATION_KEY) ?? '{}')).toEqual({ 'card.monitor.variant': 'compact' });
    expect(api.saveScope).not.toHaveBeenCalled();
    const again = createCustomizationStore({ api });
    expect(again.getState().resolve('card.monitor.variant').source).toBe('device');
  });

  it('writes workspace, layout and instance scopes through the API', async () => {
    const api = fakeApi();
    const store = createCustomizationStore({ api });
    await store.getState().setValue('layout', 'card.monitor.variant', 'compact', 'noc');
    expect(api.saveScope).toHaveBeenCalledWith('layout', 'noc', { 'card.monitor.variant': 'compact' });
    await store.getState().resetValue('layout', 'card.monitor.variant', 'noc');
    expect(api.deleteEntry).toHaveBeenCalledWith('layout:noc');
  });

  it('reverts and reports the error when the server refuses a change (view-only)', async () => {
    const api = fakeApi({ saveScope: vi.fn(async () => Promise.reject(new ApiError(403, 'Edits only from loopback'))) });
    const store = createCustomizationStore({ api });
    await store.getState().setValue('workspace', 'card.monitor.variant', 'compact');
    expect(store.getState().resolve('card.monitor.variant').source).toBe('default');
    expect(store.getState().error).toEqual({ key: 'customization.errors.forbidden' });
  });

  it('resets a whole category or scope', async () => {
    const store = createCustomizationStore({ api: fakeApi() });
    store.getState().setValue('device', 'card.monitor.variant', 'compact');
    store.getState().setValue('device', 'shape.glass', false);
    store.getState().resetCategory('device', 'cards');
    expect(store.getState().device).toEqual({ 'shape.glass': false });
    store.getState().resetScope('device');
    expect(store.getState().device).toEqual({});
  });

  it('replaces a scope from the JSON view, dropping unknown keys', async () => {
    const store = createCustomizationStore({ api: fakeApi() });
    await store.getState().replaceScope('device', { 'shape.glass': false, 'pan.unmask': true });
    expect(store.getState().device).toEqual({ 'shape.glass': false });
  });

  it('bridges density and animation to the FE-50 device preferences', () => {
    const preferences = createPreferencesStore({ density: 'spacious' });
    const store = createCustomizationStore({ api: fakeApi(), preferences });
    expect(store.getState().resolve('density.level')).toEqual({ value: 'spacious', source: 'default' });
    store.getState().setValue('device', 'density.level', 'compact');
    expect(preferences.getState().device.density).toBe('compact');
    expect(store.getState().resolve('density.level')).toEqual({ value: 'compact', source: 'device' });
    preferences.getState().set('animation', 'minimal');
    expect(store.getState().resolve('motion.level')).toEqual({ value: 'minimal', source: 'device' });
    store.getState().resetValue('device', 'density.level');
    expect(preferences.getState().device.density).toBeUndefined();
  });

  it('lists what differs from the defaults in a scope', () => {
    const store = createCustomizationStore({ api: fakeApi() });
    store.getState().setValue('device', 'shape.glass', false);
    expect(store.getState().modified('device')).toEqual(['shape.glass']);
  });
});
