import { describe, expect, it } from 'vitest';
import { addPickedField } from './display';

const preview = { columns: [{ name: '$.status', type: 'text' as const }], rows: [{ '$.status': 'UP' }], elapsedMs: 1 };

describe('FE-35 picking a JSON field', () => {
  it('adds a new selected field with suggested label and format', () => {
    const fields = addPickedField([], { path: '$.queue.size', type: 'number' }, preview);
    expect(fields).toEqual([expect.objectContaining({ field: '$.queue.size', selected: true, label: 'Size', display: 'number' })]);
  });

  it('a field already listed is selected instead of duplicated', () => {
    const existing = [{ field: '$.status', selected: false, label: 'Status', format: 'text' as const, storeAsSeries: false, display: 'text' as const }];
    expect(addPickedField(existing, { path: '$.status', type: 'text' }, preview)).toEqual([{ ...existing[0], selected: true }]);
  });

  it('sensitive names stay unselected and masked', () => {
    const [field] = addPickedField([], { path: '$.customer.email', type: 'text' }, preview);
    expect(field).toMatchObject({ selected: false, masked: true, showOnWall: false });
  });
});
