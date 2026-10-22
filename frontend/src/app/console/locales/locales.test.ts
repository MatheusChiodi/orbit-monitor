import { describe, expect, it } from 'vitest';
import { messages } from '@/shared/i18n/i18n';
import en from './en.json';
import ptBR from './pt-BR.json';

function leaves(node: unknown, prefix = ''): [string, unknown][] {
  if (typeof node !== 'object' || node === null) return [[prefix, node]];
  return Object.entries(node).flatMap(([key, value]) => leaves(value, prefix ? `${prefix}.${key}` : key));
}

describe('CORE-15 console screen messages', () => {
  it('en and pt-BR have the same non-empty keys', () => {
    const keys = (node: unknown) => leaves(node).map(([k]) => k).sort();
    expect(keys(ptBR)).toEqual(keys(en));
    expect([...leaves(en), ...leaves(ptBR)].every(([, v]) => typeof v === 'string' && v.trim() !== '')).toBe(true);
  });

  it('the merged resources (core + feature files) have the same keys in both locales', () => {
    const keys = (node: unknown) => leaves(node).map(([k]) => k).sort();
    expect(keys(messages('pt-BR'))).toEqual(keys(messages('en')));
  });
});
