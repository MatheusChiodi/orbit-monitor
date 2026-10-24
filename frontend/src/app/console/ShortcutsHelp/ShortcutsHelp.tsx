import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/shared/ui';
import { currentPlatform, formatShortcut, matchShortcut, type Shortcut } from './shortcuts';

export interface ShortcutsHelpProps {
  shortcuts: readonly Shortcut[];
  /** Controlled open state (the palette's "Keyboard shortcuts" action); uncontrolled when omitted. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

/** FE-29: "?" opens the keyboard shortcut cheat sheet; Escape closes it. */
export function ShortcutsHelp({ shortcuts, open: controlled, onOpenChange, defaultOpen = false }: ShortcutsHelpProps) {
  const { t } = useTranslation();
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = controlled ?? uncontrolled;
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const platform = currentPlatform();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!matchShortcut(event, '?')) return;
      setUncontrolled(true);
      onOpenChangeRef.current?.(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const close = () => {
    setUncontrolled(false);
    onOpenChangeRef.current?.(false);
  };

  return (
    <Dialog open={open} onClose={close} title={t('shortcuts.title')} size="sm">
      <table className="w-full border-collapse text-base">
        <tbody>
          {shortcuts.map((s) => (
            <tr key={s.id} className="border-b border-line last:border-0">
              <td className="py-2 text-text">{t(s.labelKey)}</td>
              <td className="py-2 text-right">
                <kbd className="rounded-sm border border-line-2 bg-s2 px-1.5 py-0.5 font-mono text-sm text-text">
                  {formatShortcut(s.keys, platform)}
                </kbd>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Dialog>
  );
}
