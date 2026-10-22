import { useEffect, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import { currentPlatform, formatShortcut, matchShortcut, type Shortcut } from './shortcuts';

export interface ShortcutsHelpProps {
  shortcuts: readonly Shortcut[];
  defaultOpen?: boolean;
}

/** FE-29: "?" opens the keyboard shortcut cheat sheet; Escape closes it. */
export function ShortcutsHelp({ shortcuts, defaultOpen = false }: ShortcutsHelpProps) {
  const { t } = useTranslation();
  const dialog = useMotionPreset('dialog');
  const [open, setOpen] = useState(defaultOpen);
  const platform = currentPlatform();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (matchShortcut(event, '?')) setOpen(true);
      else if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          key="shortcuts"
          role="dialog"
          aria-label={t('shortcuts.title')}
          initial={dialog.initial}
          animate={dialog.animate}
          exit={dialog.exit}
          transition={dialog.transition}
          className="fixed inset-x-0 top-[12vh] z-50 mx-auto w-[min(30rem,92vw)] rounded-[0.9rem] border border-line-2 bg-s1 p-[1rem] shadow-2xl"
        >
          <h2 className="section-label m-0 mb-[0.6rem]">{t('shortcuts.title')}</h2>
          <table className="w-full border-collapse text-[0.9rem]">
            <tbody>
              {shortcuts.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className="py-[0.4rem]">{t(s.labelKey)}</td>
                  <td className="py-[0.4rem] text-right">
                    <kbd className="rounded-[0.3rem] border border-line-2 bg-s2 px-[0.4rem] font-mono text-[0.8rem]">
                      {formatShortcut(s.keys, platform)}
                    </kbd>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </m.div>
      )}
    </AnimatePresence>
  );
}
