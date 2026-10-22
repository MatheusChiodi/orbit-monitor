import { beforeEach, describe, expect, it } from 'vitest';
import { createPreferencesStore, loadPreferences, sanitizePreferences } from './preferences';

beforeEach(() => localStorage.clear());

describe('FE-06 motion overrides per device', () => {
  it('keeps valid motion overrides and drops the rest', () => {
    expect(sanitizePreferences({ motion: { speed: 0.75, attention: false, junk: 1 } })).toEqual({ motion: { speed: 0.75, attention: false } });
    expect(sanitizePreferences({ motion: { junk: 1 } })).toEqual({});
  });

  it('setMotion stores overrides; choosing a preset level clears them', () => {
    const store = createPreferencesStore();
    store.getState().setMotion({ speed: 0.5 });
    expect(loadPreferences()).toEqual({ motion: { speed: 0.5 } });
    store.getState().setMotion({ attention: false });
    expect(store.getState().effective.motion).toEqual({ speed: 0.5, attention: false });
    store.getState().setAnimationPreset('minimal');
    expect(store.getState().device).toEqual({ animation: 'minimal' });
  });
});
