import { useEffect, useRef } from 'react';

export type ShortcutLabelKey =
  | 'shortcuts.openPalette'
  | 'shortcuts.newMonitor'
  | 'shortcuts.help'
  | 'shortcuts.undo'
  | 'shortcuts.redo';

export interface Shortcut {
  id: string;
  /** `Mod` = Ctrl on Windows/Linux, ⌘ on macOS. */
  keys: string;
  labelKey: ShortcutLabelKey;
}

export const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: 'palette.open', keys: 'Mod+K', labelKey: 'shortcuts.openPalette' },
  { id: 'monitor.new', keys: 'N', labelKey: 'shortcuts.newMonitor' },
  { id: 'help', keys: '?', labelKey: 'shortcuts.help' },
  { id: 'undo', keys: 'Mod+Z', labelKey: 'shortcuts.undo' },
  { id: 'redo', keys: 'Mod+Shift+Z', labelKey: 'shortcuts.redo' },
];

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Exact modifier match; single-key shortcuts never fire while typing in a field. */
export function matchShortcut(event: KeyboardEvent, binding: string): boolean {
  const parts = binding.split('+');
  const key = parts.at(-1)!.toLowerCase();
  const mod = parts.includes('Mod');
  const shift = parts.includes('Shift');
  if (!mod && isTyping(event.target)) return false;
  if (mod !== (event.ctrlKey || event.metaKey)) return false;
  if (event.altKey) return false;
  // Symbols like "?" already imply Shift; only letters compare it.
  if (/^[a-z]$/.test(key) && shift !== event.shiftKey) return false;
  return event.key.toLowerCase() === key;
}

export function formatShortcut(binding: string, platform: 'mac' | 'windows'): string {
  const parts = binding.split('+');
  if (platform === 'mac') return parts.map((p) => (p === 'Mod' ? '⌘' : p === 'Shift' ? '⇧' : p)).join(' ');
  return parts.map((p) => (p === 'Mod' ? 'Ctrl' : p)).join(' + ');
}

export function currentPlatform(): 'mac' | 'windows' {
  return typeof navigator !== 'undefined' && /mac/i.test(navigator.platform) ? 'mac' : 'windows';
}

/** Runs the handler of each default shortcut that matches a keydown on the window. */
export function useShortcuts(handlers: Partial<Record<string, () => void>>, shortcuts: readonly Shortcut[] = DEFAULT_SHORTCUTS): void {
  const latest = useRef(handlers);
  latest.current = handlers;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const handler = latest.current[shortcut.id];
        if (handler && matchShortcut(event, shortcut.keys)) {
          event.preventDefault();
          handler();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcuts]);
}
