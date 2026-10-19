import { describe, expect, it } from 'vitest';
import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';
import { BUILT_IN_THEMES } from './registry';

function keys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe('theme messages (en / pt-BR)', () => {
  it('both locales have the same keys', () => {
    expect(keys(ptBR).sort()).toEqual(keys(en).sort());
  });

  it('every theme without a brand name has a translated name', () => {
    for (const theme of BUILT_IN_THEMES.filter((t) => t.category !== 'editor')) {
      expect(en.presets).toHaveProperty(theme.id);
      expect(ptBR.presets).toHaveProperty(theme.id);
    }
  });
});
