import { describe, expect, it } from 'vitest';
import { moveBetweenGroups, moveItem } from './reorder';

describe('FE-13 reorder monitors and groups (pure)', () => {
  it('moves an item inside a list', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('clamps out-of-range targets and ignores invalid sources', () => {
    expect(moveItem(['a', 'b'], 0, 9)).toEqual(['b', 'a']);
    expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b']);
  });

  it('does not mutate the input', () => {
    const list = ['a', 'b'];
    moveItem(list, 0, 1);
    expect(list).toEqual(['a', 'b']);
  });

  it('moves a monitor to another group at a position', () => {
    const groups = { pay: ['reconciliation', 'checkout'], core: ['locks'] };
    expect(moveBetweenGroups(groups, { monitorId: 'checkout', from: 'pay', to: 'core', index: 0 })).toEqual({
      pay: ['reconciliation'],
      core: ['checkout', 'locks'],
    });
  });

  it('moving to the same group behaves like a reorder', () => {
    const groups = { pay: ['a', 'b', 'c'] };
    expect(moveBetweenGroups(groups, { monitorId: 'a', from: 'pay', to: 'pay', index: 2 })).toEqual({ pay: ['b', 'c', 'a'] });
  });

  it('unknown monitor or group leaves everything as is', () => {
    const groups = { pay: ['a'] };
    expect(moveBetweenGroups(groups, { monitorId: 'x', from: 'pay', to: 'pay', index: 0 })).toEqual(groups);
    expect(moveBetweenGroups(groups, { monitorId: 'a', from: 'pay', to: 'nope', index: 0 })).toEqual(groups);
  });
});

describe('FE-14 reorder fields and columns (pure)', () => {
  it('reorders table columns by key keeping the rest', () => {
    expect(moveItem(['ID', 'CUSTOMER', 'MIN'], 2, 1)).toEqual(['ID', 'MIN', 'CUSTOMER']);
  });
});
