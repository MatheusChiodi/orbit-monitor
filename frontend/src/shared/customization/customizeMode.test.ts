import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fromEntries, type CustomizationApi } from './api';
import { applyChanges, createCustomizeModeStore } from './customizeMode';
import { EMPTY_LAYERS } from './resolve';
import { createCustomizationStore } from './store';

function fakeApi(): CustomizationApi {
  return {
    load: vi.fn(async () => fromEntries([])),
    saveScope: vi.fn(async () => undefined),
    deleteEntry: vi.fn(async () => undefined),
    saveProfile: vi.fn(async () => undefined),
    loadTerminology: vi.fn(async () => ({ en: {}, 'pt-BR': {} })),
    saveTerminology: vi.fn(async () => undefined),
  };
}

const target = { type: 'card.monitor' as const, targetId: 'm1', label: 'Queue' };

beforeEach(() => localStorage.clear());

describe('applyChanges', () => {
  it('writes each change to the chosen scope; "type" clears per-item exceptions of that type', () => {
    const base = { ...EMPTY_LAYERS, instances: { 'card.monitor:m1': { 'card.monitor.variant': 'compact' }, 'card.monitor:m2': { 'card.monitor.variant': 'detailed', 'card.monitor.title': 'X' } } };
    const next = applyChanges(base, [{ id: 'card.monitor.variant', value: 'regular', applyTo: 'type', instanceId: 'card.monitor:m1', layoutId: null }]);
    expect(next.workspace).toEqual({ 'card.monitor.variant': 'regular' });
    expect(next.instances).toEqual({ 'card.monitor:m2': { 'card.monitor.title': 'X' } });
    const layout = applyChanges(EMPTY_LAYERS, [{ id: 'card.monitor.variant', value: 'compact', applyTo: 'layout', instanceId: null, layoutId: 'noc' }]);
    expect(layout.layouts).toEqual({ noc: { 'card.monitor.variant': 'compact' } });
  });

  it('ignores a change for a scope the setting does not allow', () => {
    const next = applyChanges(EMPTY_LAYERS, [{ id: 'card.monitor.title', value: 'Hi', applyTo: 'device', instanceId: null, layoutId: null }]);
    expect(next.device).toEqual({});
  });
});

describe('Customize mode', () => {
  it('previews changes live without saving, undoes and discards them', () => {
    const api = fakeApi();
    const store = createCustomizationStore({ api });
    const mode = createCustomizeModeStore(store);
    mode.getState().toggle(true);
    mode.getState().select(target);
    mode.getState().change('card.monitor.variant', 'compact');
    expect(store.getState().resolve('card.monitor.variant', { instanceId: 'card.monitor:m1' }).value).toBe('compact');
    expect(store.getState().resolve('card.monitor.variant', { instanceId: 'card.monitor:m2' }).value).toBe('regular');
    expect(api.saveScope).not.toHaveBeenCalled();
    mode.getState().change('card.monitor.variant', 'detailed');
    mode.getState().undo();
    expect(store.getState().resolve('card.monitor.variant', { instanceId: 'card.monitor:m1' }).value).toBe('compact');
    mode.getState().discard();
    expect(store.getState().resolve('card.monitor.variant', { instanceId: 'card.monitor:m1' }).value).toBe('regular');
    expect(mode.getState().changes).toEqual([]);
  });

  it('saves every touched scope on Save', async () => {
    const api = fakeApi();
    const store = createCustomizationStore({ api });
    const mode = createCustomizeModeStore(store);
    mode.getState().toggle(true);
    mode.getState().select(target);
    mode.getState().change('card.monitor.title', 'Recon');
    mode.getState().setApplyTo('device');
    mode.getState().change('card.monitor.variant', 'compact');
    await mode.getState().save();
    expect(api.saveScope).toHaveBeenCalledWith('instance', 'card.monitor:m1', { 'card.monitor.title': 'Recon' });
    expect(store.getState().device).toEqual({ 'card.monitor.variant': 'compact' });
    expect(mode.getState().changes).toEqual([]);
    expect(store.getState().resolve('card.monitor.title', { instanceId: 'card.monitor:m1' }).source).toBe('instance');
  });

  it('falls back to an allowed scope when the chosen one does not apply', () => {
    const store = createCustomizationStore({ api: fakeApi() });
    const mode = createCustomizeModeStore(store);
    mode.getState().toggle(true);
    mode.getState().select(target);
    mode.getState().setApplyTo('workspace');
    mode.getState().change('card.monitor.title', 'Recon');
    expect(mode.getState().changes[0]).toMatchObject({ applyTo: 'instance', instanceId: 'card.monitor:m1' });
  });

  it('leaving the mode keeps unsaved changes out of the view', () => {
    const store = createCustomizationStore({ api: fakeApi() });
    const mode = createCustomizeModeStore(store);
    mode.getState().toggle(true);
    mode.getState().select(target);
    mode.getState().change('card.monitor.variant', 'compact');
    mode.getState().toggle(false);
    expect(mode.getState().selected).toBeNull();
    expect(store.getState().resolve('card.monitor.variant').value).toBe('regular');
  });
});
