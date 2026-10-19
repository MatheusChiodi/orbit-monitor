import { describe, expect, it } from 'vitest';
import { HISTORY_LIMIT, createHistory } from './history';

describe('FE-15 undo/redo history', () => {
  it('undo returns the previous state and redo goes forward again', () => {
    let h = createHistory('a');
    h = h.push('b');
    h = h.push('c');
    h = h.undo();
    expect(h.present).toBe('b');
    h = h.undo();
    expect(h.present).toBe('a');
    h = h.redo();
    expect(h.present).toBe('b');
  });

  it('a new change after undo clears the redo stack', () => {
    let h = createHistory('a').push('b').undo().push('c');
    expect(h.canRedo).toBe(false);
    h = h.redo();
    expect(h.present).toBe('c');
  });

  it('undo/redo at the edges are no-ops', () => {
    const h = createHistory('a');
    expect(h.canUndo).toBe(false);
    expect(h.undo().present).toBe('a');
    expect(h.redo().present).toBe('a');
  });

  it('is bounded: keeps at most HISTORY_LIMIT past states', () => {
    let h = createHistory(0);
    for (let i = 1; i <= HISTORY_LIMIT + 10; i += 1) h = h.push(i);
    let undos = 0;
    while (h.canUndo) {
      h = h.undo();
      undos += 1;
    }
    expect(undos).toBe(HISTORY_LIMIT);
    expect(h.present).toBe(10);
  });

  it('pushing an equal state does not create an entry', () => {
    const h = createHistory('a').push('a');
    expect(h.canUndo).toBe(false);
  });

  it('is immutable', () => {
    const h = createHistory('a');
    h.push('b');
    expect(h.present).toBe('a');
  });
});
