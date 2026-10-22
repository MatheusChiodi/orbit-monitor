import { describe, expect, it, vi } from 'vitest';
import { createI18n } from '@/shared/i18n/i18n';
import { applyTerminology, catalogEntries, createTerminologyStore, sanitizeTerminology } from './terminology';
import type { CustomizationApi } from './api';

describe('FE-54 terminology', () => {
  it('lists every translatable label of a locale with its original text', () => {
    const entries = catalogEntries('en');
    expect(entries.find((e) => e.key === 'status.label.DOWN')?.text).toBeTruthy();
    expect(entries.find((e) => e.key === 'customization.title')?.text).toBe('Customization');
    expect(new Set(entries.map((e) => e.key)).size).toBe(entries.length);
  });

  it('only accepts overrides for labels that exist, non-empty and short', () => {
    expect(sanitizeTerminology({ en: { 'status.label.DOWN': ' Offline ', 'made.up.key': 'x', 'app.name': '' }, 'pt-BR': { 'status.label.DOWN': 'y'.repeat(121) } })).toEqual({
      en: { 'status.label.DOWN': 'Offline' },
      'pt-BR': {},
    });
  });

  it('renames labels per language and restores the originals on reset', () => {
    const i18n = createI18n('en');
    const original = i18n.t('status.label.DOWN');
    applyTerminology(i18n, { en: { 'status.label.DOWN': 'Offline' }, 'pt-BR': { 'status.label.DOWN': 'Fora do ar' } });
    expect(i18n.t('status.label.DOWN')).toBe('Offline');
    expect(i18n.getFixedT('pt-BR')('status.label.DOWN')).toBe('Fora do ar');
    applyTerminology(i18n, { en: {}, 'pt-BR': {} });
    expect(i18n.t('status.label.DOWN')).toBe(original);
  });

  it('loads, edits and saves through the API', async () => {
    const api = {
      loadTerminology: vi.fn(async () => ({ en: { 'status.label.DOWN': 'Offline' }, 'pt-BR': {} })),
      saveTerminology: vi.fn(async () => undefined),
    } as unknown as CustomizationApi;
    const store = createTerminologyStore(api);
    await store.getState().load();
    expect(store.getState().labels.en).toEqual({ 'status.label.DOWN': 'Offline' });
    await store.getState().save('pt-BR', { 'status.label.DOWN': 'Fora do ar', 'nope.key': 'x' });
    expect(api.saveTerminology).toHaveBeenCalledWith('pt-BR', { 'status.label.DOWN': 'Fora do ar' });
    expect(store.getState().labels['pt-BR']).toEqual({ 'status.label.DOWN': 'Fora do ar' });
  });
});
