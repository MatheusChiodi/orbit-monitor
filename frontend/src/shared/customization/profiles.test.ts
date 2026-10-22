import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fromEntries, type CustomizationApi } from './api';
import { BUILT_IN_PROFILES, applyProfile, duplicateProfile, exportProfile, parseProfileFile, profileFromScope } from './profiles';
import { getSetting } from './registry';
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

beforeEach(() => localStorage.clear());

describe('FE-57 profiles', () => {
  it('ships the four built-in profiles with valid settings only', () => {
    expect(BUILT_IN_PROFILES.map((p) => p.id)).toEqual(['builtin:orbit-default', 'builtin:tv-wall', 'builtin:compact-console', 'builtin:accessible']);
    for (const profile of BUILT_IN_PROFILES) {
      for (const id of Object.keys(profile.settings)) expect(getSetting(id), id).toBeDefined();
    }
    expect(BUILT_IN_PROFILES[0]!.settings).toEqual({});
    expect(BUILT_IN_PROFILES[3]!.settings['motion.level']).toBe('minimal');
  });

  it('applies a profile to this device or to a layout, replacing that scope', async () => {
    const api = fakeApi();
    const store = createCustomizationStore({ api });
    store.getState().setValue('device', 'shape.radius', 'round');
    const accessible = BUILT_IN_PROFILES[3]!;
    await applyProfile(store, accessible, { scope: 'device' });
    expect(store.getState().device['shape.radius']).toBeUndefined();
    expect(store.getState().resolve('shape.borderWidth').value).toBe('thick');
    await applyProfile(store, BUILT_IN_PROFILES[1]!, { scope: 'layout', layoutId: 'noc' });
    expect(api.saveScope).toHaveBeenCalledWith('layout', 'noc', expect.objectContaining({ 'shape.glass': false }));
  });

  it('saves, duplicates and deletes custom profiles through the API', async () => {
    const api = fakeApi();
    const store = createCustomizationStore({ api });
    store.getState().setValue('device', 'shape.glass', false);
    const mine = profileFromScope(store, 'Night shift', 'device', []);
    expect(mine).toMatchObject({ id: 'profile:night-shift', name: 'Night shift', settings: { 'shape.glass': false } });
    await store.getState().saveProfile(mine);
    expect(api.saveProfile).toHaveBeenCalledWith(mine);
    const copy = duplicateProfile(mine, 'Night shift (copy)', store.getState().profiles);
    expect(copy.id).toBe('profile:night-shift-copy');
    await store.getState().saveProfile(copy);
    await store.getState().deleteProfile(mine.id);
    expect(api.deleteEntry).toHaveBeenCalledWith('profile:night-shift');
    expect(store.getState().profiles.map((p) => p.id)).toEqual(['profile:night-shift-copy']);
  });

  it('exports and imports the BE-51 profile file, never carrying unknown keys', () => {
    const text = exportProfile({ id: 'profile:x', name: 'NOC', settings: { 'shape.glass': false } });
    expect(JSON.parse(text)).toEqual({ format: 'orbit.customization-profile', version: 1, name: 'NOC', values: { 'shape.glass': false } });
    const file = { format: 'orbit.customization-profile', version: 1, name: 'NOC', values: { 'shape.glass': false, 'connection.password': 'hunter2' } };
    expect(parseProfileFile(JSON.stringify(file), [])).toEqual({ ok: true, profile: { id: 'profile:noc', name: 'NOC', settings: { 'shape.glass': false } } });
    expect(parseProfileFile('{nope', [])).toEqual({ ok: false, error: { key: 'customization.profiles.file.invalidJson' } });
    expect(parseProfileFile('{"version":9}', [])).toEqual({ ok: false, error: { key: 'customization.profiles.file.unsupportedVersion', params: { version: 9 } } });
    expect(parseProfileFile('{"format":"orbit.customization-profile","version":1,"values":{}}', [])).toEqual({ ok: false, error: { key: 'customization.profiles.file.invalid' } });
  });
});
