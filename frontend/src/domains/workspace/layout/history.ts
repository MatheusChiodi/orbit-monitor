/** FE-15: bounded, immutable undo/redo history. */
export const HISTORY_LIMIT = 50;

export interface History<T> {
  present: T;
  canUndo: boolean;
  canRedo: boolean;
  push: (next: T) => History<T>;
  undo: () => History<T>;
  redo: () => History<T>;
}

function same<T>(a: T, b: T): boolean {
  return Object.is(a, b) || JSON.stringify(a) === JSON.stringify(b);
}

function build<T>(past: readonly T[], present: T, future: readonly T[]): History<T> {
  return {
    present,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    push: (next) => (same(next, present) ? build(past, present, future) : build([...past, present].slice(-HISTORY_LIMIT), next, [])),
    undo: () => (past.length === 0 ? build(past, present, future) : build(past.slice(0, -1), past[past.length - 1] as T, [present, ...future])),
    redo: () => (future.length === 0 ? build(past, present, future) : build([...past, present], future[0] as T, future.slice(1))),
  };
}

export function createHistory<T>(initial: T): History<T> {
  return build([], initial, []);
}
