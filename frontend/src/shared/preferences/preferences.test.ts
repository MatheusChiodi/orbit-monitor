import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  LEGACY_OPERATOR_KEY,
  PREFERENCES_KEY,
  createPreferencesStore,
  forgetLegacyOperator,
  exportPreferences,
  loadPreferences,
  mergeWithWorkspaceDefaults,
  parsePreferencesFile,
  savePreferences,
} from './preferences';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

const workspaceDefaults = { theme: 'high-contrast', animation: 'minimal', density: 'compact', locale: 'pt-BR', scale: '5m' } as const;

describe('FE-50 device preferences — model and storage', () => {
  it('defaults: Orbit Dark, standard animation, comfortable density, en, 3 m (no operator name)', () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      theme: 'orbit-dark',
      animation: 'standard',
      density: 'comfortable',
      locale: 'en',
      scale: '3m',
    });
  });

  it('workspace defaults from the API fill what the device has not chosen', () => {
    expect(mergeWithWorkspaceDefaults({ density: 'spacious' }, workspaceDefaults)).toEqual({
      ...DEFAULT_PREFERENCES,
      ...workspaceDefaults,
      density: 'spacious',
    });
  });

  it('device choices win over workspace defaults', () => {
    expect(mergeWithWorkspaceDefaults({ locale: 'en' }, workspaceDefaults).locale).toBe('en');
  });

  it('saves only the device choices in localStorage', () => {
    savePreferences({ locale: 'pt-BR' });
    expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}')).toEqual({ locale: 'pt-BR' });
    expect(loadPreferences()).toEqual({ locale: 'pt-BR' });
  });

  it('a self-declared operator name is no longer a preference: older saved or imported names are dropped', () => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ locale: 'pt-BR', operatorName: 'M. Chiodi' }));
    expect(loadPreferences()).toEqual({ locale: 'pt-BR' });
    expect(parsePreferencesFile(JSON.stringify({ version: 1, preferences: { theme: 'light', operatorName: 'Ana' } }))).toEqual({
      ok: true,
      preferences: { theme: 'light' },
    });
  });

  it('forgets the retired orbit.operator key once, and survives blocked storage', () => {
    localStorage.setItem(LEGACY_OPERATOR_KEY, 'M. Chiodi');
    forgetLegacyOperator();
    expect(LEGACY_OPERATOR_KEY).toBe('orbit.operator');
    expect(localStorage.getItem('orbit.operator')).toBeNull();
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => forgetLegacyOperator()).not.toThrow();
  });

  it('drops unknown keys and invalid values on load', () => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ density: 'huge', theme: 'light', payload: { rows: [1] } }));
    expect(loadPreferences()).toEqual({ theme: 'light' });
  });

  it('survives blocked or corrupted storage', () => {
    localStorage.setItem(PREFERENCES_KEY, '{oops');
    expect(loadPreferences()).toEqual({});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => savePreferences({ locale: 'en' })).not.toThrow();
  });

  it('the store exposes the effective preferences and updates one field at a time', () => {
    const store = createPreferencesStore(workspaceDefaults);
    expect(store.getState().effective.locale).toBe('pt-BR');
    store.getState().set('locale', 'en');
    expect(store.getState().effective.locale).toBe('en');
    expect(loadPreferences()).toEqual({ locale: 'en' });
    store.getState().reset();
    expect(store.getState().effective.locale).toBe('pt-BR');
    expect(loadPreferences()).toEqual({});
  });
});

describe('FE-50 device preferences — JSON export/import', () => {
  it('exports a versioned document with the device choices only', () => {
    const json = JSON.parse(exportPreferences({ theme: 'light', density: 'compact' }));
    expect(json).toEqual({ version: 1, preferences: { theme: 'light', density: 'compact' } });
  });

  it('round-trips', () => {
    expect(parsePreferencesFile(exportPreferences({ density: 'compact' }))).toEqual({ ok: true, preferences: { density: 'compact' } });
  });

  it('never imports secrets, probe data or config: only the known preference keys survive', () => {
    const text = JSON.stringify({
      version: 1,
      preferences: { theme: 'light', password: 'x', token: 'eyJhbGciOi', rows: [{ PAN: '4111 1111 1111 1111' }] },
    });
    expect(parsePreferencesFile(text)).toEqual({ ok: true, preferences: { theme: 'light' } });
  });

  it('rejects invalid JSON and unknown versions with translatable errors', () => {
    expect(parsePreferencesFile('nope')).toEqual({ ok: false, error: { key: 'preferences.file.invalidJson' } });
    expect(parsePreferencesFile(JSON.stringify({ version: 7, preferences: {} }))).toEqual({
      ok: false,
      error: { key: 'preferences.file.unsupportedVersion', params: { version: 7 } },
    });
  });
});
