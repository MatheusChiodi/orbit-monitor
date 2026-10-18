import { afterEach, describe, expect, it, vi } from 'vitest';
import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';
import {
  LOCALE_STORAGE_KEY,
  createI18n,
  loadSavedLocale,
  messages,
  resolveLocale,
  saveLocale,
  setLocale,
} from './i18n';

function leafKeys(node: unknown, prefix = ''): string[] {
  if (typeof node !== 'object' || node === null) return [prefix];
  return Object.entries(node).flatMap(([key, value]) => leafKeys(value, prefix ? `${prefix}.${key}` : key));
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('locale files', () => {
  it('en and pt-BR have exactly the same keys', () => {
    expect(leafKeys(ptBR).sort()).toEqual(leafKeys(en).sort());
  });

  it('no translation is empty', () => {
    const values = (node: unknown): unknown[] =>
      typeof node === 'object' && node !== null ? Object.values(node).flatMap(values) : [node];
    const all = [...values(en), ...values(ptBR)];
    expect(all.every((v) => typeof v === 'string' && v.trim().length > 0)).toBe(true);
  });
});

describe('resolveLocale', () => {
  it('?lang= wins when supported', () => {
    expect(resolveLocale({ search: '?lang=pt-BR', saved: 'en', languages: ['en-US'] })).toBe('pt-BR');
  });
  it('ignores unsupported ?lang= and falls back to the saved locale', () => {
    expect(resolveLocale({ search: '?lang=fr', saved: 'pt-BR', languages: [] })).toBe('pt-BR');
  });
  it('falls back to navigator.language (pt-* → pt-BR)', () => {
    expect(resolveLocale({ search: '', saved: null, languages: ['pt-PT', 'en'] })).toBe('pt-BR');
    expect(resolveLocale({ search: '', saved: null, languages: ['en-GB'] })).toBe('en');
  });
  it('defaults to en', () => {
    expect(resolveLocale({ search: '', saved: null, languages: ['fr-FR'] })).toBe('en');
  });
});

describe('locale persistence', () => {
  it('saves and loads from localStorage', () => {
    saveLocale('pt-BR');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('pt-BR');
    expect(loadSavedLocale()).toBe('pt-BR');
  });

  it('ignores invalid saved values', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'xx');
    expect(loadSavedLocale()).toBeNull();
  });

  it('survives blocked storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadSavedLocale()).toBeNull();
    expect(() => saveLocale('en')).not.toThrow();
  });
});

describe('createI18n', () => {
  it('translates in English and Brazilian Portuguese', () => {
    expect(createI18n('en').t('wall.ack.button')).toBe('Acknowledge');
    expect(createI18n('pt-BR').t('wall.ack.button')).toBe('Reconhecer');
  });

  it('handles plurals', () => {
    const enI18n = createI18n('en');
    expect(enI18n.t('status.phrase.down', { count: 1 })).toBe('1 monitor down');
    expect(enI18n.t('status.phrase.down', { count: 3 })).toBe('3 monitors down');
    expect(createI18n('pt-BR').t('status.phrase.down', { count: 3 })).toBe('3 monitores fora');
  });

  it('setLocale switches language, persists it and updates <html lang>', async () => {
    const i18n = createI18n('en');
    await setLocale(i18n, 'pt-BR');
    expect(i18n.t('status.phrase.ok')).toBe('Tudo operacional');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('pt-BR');
    expect(document.documentElement.lang).toBe('pt-BR');
  });
});

describe('messages', () => {
  it('returns the raw resource for pure formatters', () => {
    expect(messages('en').time.ago).toBe('{{duration}} ago');
    expect(messages('pt-BR').time.ago).toBe('há {{duration}}');
  });
});
