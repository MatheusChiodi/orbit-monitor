import type { ReactNode } from 'react';
import type { Tone } from '../tones';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  /** Matches the verb of the button that caused it ("Save monitor" → "Monitor saved"). */
  title: ReactNode;
  description?: ReactNode;
  /** DOWN is announced as an alert; everything else politely. */
  tone?: Tone;
  action?: ToastAction;
  /** ms; 0 keeps it until dismissed. Default 5000 (8000 with an action). */
  duration?: number;
}

export interface ToastItem extends ToastOptions {
  id: number;
}

type Listener = () => void;

let items: readonly ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();
/** At most this many toasts at once; the oldest leaves first. */
const MAX_VISIBLE = 3;

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts(): readonly ToastItem[] {
  return items;
}

export function dismissToast(id: number): void {
  clearTimeout(timers.get(id));
  timers.delete(id);
  items = items.filter((item) => item.id !== id);
  emit();
}

export function dismissAllToasts(): void {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  items = [];
  emit();
}

/** Shows a toast from anywhere (components use `useToast()`); returns its id. */
export function showToast(options: ToastOptions): number {
  const id = nextId++;
  const duration = options.duration ?? (options.action ? 8000 : 5000);
  items = [...items, { ...options, id }].slice(-MAX_VISIBLE);
  if (duration > 0) timers.set(id, setTimeout(() => dismissToast(id), duration));
  emit();
  return id;
}
