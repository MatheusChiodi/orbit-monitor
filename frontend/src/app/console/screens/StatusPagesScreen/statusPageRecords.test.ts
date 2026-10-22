import { describe, expect, it } from 'vitest';
import { fromRecord, toRecord } from './statusPageRecords';

describe('FE-44 status page records', () => {
  it('reads orbit.status-pages.json items (pub → visibility)', () => {
    expect(fromRecord({ id: 'sp-pay', slug: 'pay', title: 'Payments', pub: true, groupIds: ['g'] })).toEqual({
      title: 'Payments',
      slug: 'pay',
      visibility: 'public',
      groupIds: ['g'],
    });
    expect(fromRecord({ id: 'x', slug: 'x' })).toEqual({ title: 'x', slug: 'x', visibility: 'internal', groupIds: [] });
  });

  it('writes groups only; an existing slug keeps its id', () => {
    const existing = [{ id: 'old-id', slug: 'pay' }];
    expect(toRecord({ title: 'Payments', slug: 'pay', visibility: 'internal', groupIds: ['g'] }, existing)).toEqual({
      id: 'old-id',
      slug: 'pay',
      title: 'Payments',
      pub: false,
      groupIds: ['g'],
    });
    expect(toRecord({ title: 'Cards', slug: 'cards', visibility: 'public', groupIds: [] }, existing).id).toBe('sp-cards');
  });
});
