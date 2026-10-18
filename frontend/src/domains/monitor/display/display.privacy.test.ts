import { describe, expect, it } from 'vitest';
import { makeCpf, makePan } from '@/test/sensitive';
import { suggestFields } from './display';

const preview = {
  columns: [
    { name: 'CARD_NUMBER', type: 'text' as const },
    { name: 'CVV', type: 'text' as const },
    { name: 'DOC', type: 'text' as const },
    { name: 'PENDING_QTY', type: 'number' as const },
  ],
  rows: [{ CARD_NUMBER: makePan(), CVV: '123', DOC: makeCpf(), PENDING_QTY: 3 }],
  elapsedMs: 10,
};

describe('CORE-16 field classification in Data & display', () => {
  it('classifies fields by name and by sample value', () => {
    const byField = Object.fromEntries(suggestFields(preview, 'SQL').map((f) => [f.field, f]));
    expect(byField.CARD_NUMBER).toMatchObject({ dataClass: 'PCI_PAN', masked: true, storeAsSeries: false, selected: false });
    expect(byField.CVV).toMatchObject({ dataClass: 'PCI_SAD', masked: true, storeAsSeries: false, selected: false });
    expect(byField.DOC).toMatchObject({ dataClass: 'PERSONAL', masked: true, selected: false });
    expect(byField.PENDING_QTY).toMatchObject({ dataClass: null, masked: false, selected: true });
  });

  it('sensitive fields are never pre-selected for storage (minimization)', () => {
    const selected = suggestFields(preview, 'SQL').filter((f) => f.selected).map((f) => f.field);
    expect(selected).toEqual(['PENDING_QTY']);
  });
});
