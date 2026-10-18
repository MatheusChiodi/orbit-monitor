import { createStore } from 'zustand/vanilla';

/** Orbit has no login: the operator declares a display name once and it stays on this device. */
export const OPERATOR_KEY = 'orbit.operator';
const MAX_LENGTH = 60;

export function normalizeOperatorName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ').slice(0, MAX_LENGTH);
  return name === '' ? null : name;
}

export function loadOperator(): string | null {
  try {
    const saved = localStorage.getItem(OPERATOR_KEY);
    return saved ? normalizeOperatorName(saved) : null;
  } catch {
    return null;
  }
}

export function saveOperator(name: string | null): void {
  try {
    if (name) localStorage.setItem(OPERATOR_KEY, name);
    else localStorage.removeItem(OPERATOR_KEY);
  } catch {
    // storage blocked: the name lasts only for this page
  }
}

export interface OperatorState {
  name: string | null;
  setName: (raw: string) => void;
  clear: () => void;
}

export function createOperatorStore() {
  return createStore<OperatorState>()((set) => ({
    name: loadOperator(),
    setName: (raw) => {
      const name = normalizeOperatorName(raw);
      if (!name) return;
      saveOperator(name);
      set({ name });
    },
    clear: () => {
      saveOperator(null);
      set({ name: null });
    },
  }));
}

export type OperatorStore = ReturnType<typeof createOperatorStore>;
