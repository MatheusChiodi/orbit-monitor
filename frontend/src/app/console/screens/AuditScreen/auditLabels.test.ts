import { describe, expect, it } from 'vitest';
import { createI18n } from '@/shared/i18n/i18n';
import { areaPrefix, auditActionLabel } from './auditLabels';

describe('FE-36 audit labels', () => {
  const en = createI18n('en').t;
  const pt = createI18n('pt-BR').t;

  it('known actions read as sentences, in both languages', () => {
    expect(auditActionLabel(en, 'sql.save')).toBe('Query monitor saved');
    expect(auditActionLabel(en, 'status-page.delete')).toBe('Status page deleted');
    expect(auditActionLabel(pt, 'incident.ack')).toBe('Incidente reconhecido');
  });

  it('unknown or malformed actions fall back to the raw key', () => {
    expect(auditActionLabel(en, 'future.thing')).toBe('future.thing');
    expect(auditActionLabel(en, 'weird')).toBe('weird');
  });

  it('an area filters by its prefix; "any" sends nothing', () => {
    expect(areaPrefix('incident')).toBe('incident.');
    expect(areaPrefix('')).toBe('');
  });
});
