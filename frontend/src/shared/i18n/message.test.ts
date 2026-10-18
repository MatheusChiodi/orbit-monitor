import { describe, expect, it } from 'vitest';
import { createI18n } from './i18n';
import { msg, translate } from './message';

describe('message descriptors', () => {
  it('pure code returns a key + params; the UI translates it per locale', () => {
    const m = msg('sql.errors.forbidden', { word: 'DELETE' });
    expect(translate(createI18n('en').t, m)).toBe('Statement not allowed: DELETE');
    expect(translate(createI18n('pt-BR').t, m)).toBe('Comando não permitido: DELETE');
  });

  it('works without params', () => {
    expect(translate(createI18n('en').t, msg('sql.errors.empty'))).toBe('Paste a SELECT');
  });
});
