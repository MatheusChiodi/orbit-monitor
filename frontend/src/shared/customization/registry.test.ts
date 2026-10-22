import { describe, expect, it } from 'vitest';
import {
  SETTINGS,
  defineSetting,
  getSetting,
  isSettingId,
  sanitizeSettings,
  settingsForTarget,
  validateSettingValue,
} from './registry';
import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';

function lookup(messages: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), messages);
}

describe('defineSetting', () => {
  it('rejects a default that does not pass its own schema', () => {
    expect(() =>
      defineSetting({
        id: 'test.broken',
        type: 'enum',
        values: ['a', 'b'],
        default: 'c',
        scopes: ['workspace'],
        category: 'behavior',
        label: 'customization.title',
      }),
    ).toThrow(/default/);
  });

  it('rejects malformed ids and empty scopes', () => {
    const base = { type: 'boolean', default: true, category: 'behavior', label: 'customization.title' } as const;
    expect(() => defineSetting({ ...base, id: 'Bad Id', scopes: ['workspace'] })).toThrow(/id/);
    expect(() => defineSetting({ ...base, id: 'test.ok', scopes: [] })).toThrow(/scope/);
  });
});

describe('validateSettingValue', () => {
  const number = defineSetting({ id: 'test.size', type: 'number', min: 13, max: 20, step: 1, default: 15, scopes: ['device'], category: 'typography', label: 'customization.title' });
  const list = defineSetting({ id: 'test.fields', type: 'list', values: ['status', 'name', 'value'], required: ['status'], default: ['status', 'name'], scopes: ['device'], category: 'cards', label: 'customization.title' });
  const text = defineSetting({ id: 'test.title', type: 'text', maxLength: 10, default: '', scopes: ['instance'], category: 'cards', label: 'customization.title' });
  const color = defineSetting({ id: 'test.color', type: 'color', default: 'info', scopes: ['workspace'], category: 'shape', label: 'customization.title' });

  it('clamps numbers to the range and snaps them to the step', () => {
    expect(validateSettingValue(number, 12)).toBe(13);
    expect(validateSettingValue(number, 99)).toBe(20);
    expect(validateSettingValue(number, 16.4)).toBe(16);
    expect(validateSettingValue(number, 'big')).toBeUndefined();
    expect(validateSettingValue(number, Number.NaN)).toBeUndefined();
  });

  it('keeps known list items in order, drops duplicates and always keeps required items', () => {
    expect(validateSettingValue(list, ['value', 'name', 'value', 'secret'])).toEqual(['status', 'value', 'name']);
    expect(validateSettingValue(list, 'status')).toBeUndefined();
  });

  it('trims text, strips control characters and enforces the length', () => {
    expect(validateSettingValue(text, '  Queue\u0007  ')).toBe('Queue');
    expect(validateSettingValue(text, 'x'.repeat(11))).toBeUndefined();
  });

  it('accepts theme tokens and hex colors only', () => {
    expect(validateSettingValue(color, 'down')).toBe('down');
    expect(validateSettingValue(color, '#A1b2C3')).toBe('#a1b2c3');
    expect(validateSettingValue(color, 'url(javascript:alert(1))')).toBeUndefined();
  });
});

describe('sanitizeSettings', () => {
  it('keeps only registered ids with valid values for the scope', () => {
    const clean = sanitizeSettings(
      { 'card.monitor.variant': 'compact', 'card.monitor.title': 'Queue', 'unknown.setting': 1, 'card.monitor.clickAction': 'explode' },
      'workspace',
    );
    expect(clean).toEqual({ 'card.monitor.variant': 'compact' });
  });

  it('returns an empty object for non-objects', () => {
    expect(sanitizeSettings(null, 'device')).toEqual({});
    expect(sanitizeSettings([1, 2], 'device')).toEqual({});
  });
});

describe('the registry', () => {
  it('has unique, well-formed ids', () => {
    const ids = SETTINGS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(isSettingId(id)).toBe(true);
    expect(getSetting('card.monitor.clickAction')?.type).toBe('action');
  });

  it('labels every setting and every option in English and Portuguese', () => {
    for (const setting of SETTINGS) {
      for (const messages of [en, ptBR]) {
        expect(typeof lookup({ customization: messages }, setting.label), setting.label).toBe('string');
        if ('values' in setting) {
          for (const value of setting.values) {
            expect(typeof lookup(messages, `values.${value}`), `${setting.id}: ${value}`).toBe('string');
          }
        }
      }
    }
  });

  it('never registers a setting that could weaken the safety guarantees (docs/07 §7)', () => {
    const forbidden = /(^|\.)(full)?[pP]an([A-Z.]|$)|[cC]ardNumber|[sS]ecret|[mM]ask|[rR]edact|[rR]ead[oO]nly|[rR]owLimit|[tT]imeout|[sS]ql|SQL|[mM]etadata|[rR]educedMotion|[aA]ccess|[cC]ontrast/;
    for (const setting of SETTINGS) expect(setting.id, setting.id).not.toMatch(forbidden);
  });

  it('keeps the state visible as text on every card', () => {
    const fields = getSetting('card.monitor.fields');
    expect(fields && 'required' in fields ? fields.required : []).toContain('status');
  });

  it('lists the settings of one component type', () => {
    const ids = settingsForTarget('card.monitor').map((s) => s.id);
    expect(ids).toContain('card.monitor.variant');
    expect(ids.every((id) => id.startsWith('card.monitor.'))).toBe(true);
  });
});
