import { afterEach, describe, expect, it, vi } from 'vitest';
import { OPERATOR_KEY, createOperatorStore, loadOperator, normalizeOperatorName, saveOperator } from './operator';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('normalizeOperatorName', () => {
  it('trims and collapses spaces, max 60 characters', () => {
    expect(normalizeOperatorName('  M.   Chiodi ')).toBe('M. Chiodi');
    expect(normalizeOperatorName('x'.repeat(80))).toHaveLength(60);
  });
  it('empty becomes null', () => {
    expect(normalizeOperatorName('   ')).toBeNull();
  });
});

describe('operator persistence (device only)', () => {
  it('saves and loads the name from localStorage', () => {
    saveOperator('M. Chiodi');
    expect(localStorage.getItem(OPERATOR_KEY)).toBe('M. Chiodi');
    expect(loadOperator()).toBe('M. Chiodi');
  });

  it('survives blocked storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadOperator()).toBeNull();
    expect(() => saveOperator('Ana')).not.toThrow();
  });
});

describe('createOperatorStore', () => {
  it('starts with the saved name', () => {
    saveOperator('R. Lima');
    expect(createOperatorStore().getState().name).toBe('R. Lima');
  });

  it('setName normalizes, persists and ignores empty names', () => {
    const store = createOperatorStore();
    store.getState().setName('  Ana  ');
    expect(store.getState().name).toBe('Ana');
    expect(loadOperator()).toBe('Ana');
    store.getState().setName('  ');
    expect(store.getState().name).toBe('Ana');
  });

  it('clear forgets the name', () => {
    const store = createOperatorStore();
    store.getState().setName('Ana');
    store.getState().clear();
    expect(store.getState().name).toBeNull();
    expect(loadOperator()).toBeNull();
  });
});
