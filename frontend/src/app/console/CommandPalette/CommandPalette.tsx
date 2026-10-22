import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { AccessMode } from '@/shared/api/types';
import { useAnimationLevel, type AnimationLevel } from '@/shared/motion/animationLevel';
import { motionPreset } from '@/shared/motion/presets';
import { PALETTE_KINDS, searchPalette, type PaletteItem } from './palette';

export interface CommandPaletteProps {
  items: readonly PaletteItem[];
  mode: AccessMode;
  onSelect: (item: PaletteItem) => void;
  /** Overrides the provider level (tests, previews). */
  animationLevel?: AnimationLevel;
  defaultOpen?: boolean;
}

/** FE-28: `Ctrl+K` / `⌘K` opens a searchable list of monitors, groups, layouts and actions. */
export function CommandPalette({ items, mode, onSelect, animationLevel, defaultOpen = false }: CommandPaletteProps) {
  const { t } = useTranslation();
  const contextLevel = useAnimationLevel();
  const level = animationLevel ?? contextLevel;
  const dialog = motionPreset(level, 'dialog');
  const listId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const returnFocus = useRef<HTMLElement | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const visible = searchPalette(
    items.filter((item) => mode === 'edit' || !item.requiresEdit),
    query,
  );
  const ordered = PALETTE_KINDS.flatMap((kind) => visible.filter((item) => item.kind === kind));

  function close() {
    setOpen(false);
    setQuery('');
    setActive(-1);
    returnFocus.current?.focus();
  }

  function choose(item: PaletteItem) {
    onSelect(item);
    close();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, ordered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      const item = ordered[active] ?? ordered[0];
      if (item) choose(item);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  const optionId = (item: PaletteItem) => `${listId}-${item.id}`;
  const activeItem = ordered[active];

  return (
    <AnimatePresence>
      {open && (
        <m.div
          key="palette"
          role="dialog"
          aria-modal="true"
          aria-label={t('palette.title')}
          data-animation={level}
          initial={dialog.initial}
          animate={dialog.animate}
          exit={dialog.exit}
          transition={dialog.transition}
          className="fixed inset-x-0 top-[12vh] z-50 mx-auto w-[min(36rem,92vw)] rounded-[0.9rem] border border-line-2 bg-s1 p-[0.8rem] shadow-2xl"
        >
          <input
            ref={input}
            role="combobox"
            aria-label={t('palette.search')}
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={activeItem ? optionId(activeItem) : undefined}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(-1);
            }}
            onKeyDown={onKeyDown}
            className="h-[2.4rem] w-full rounded-[0.45rem] border border-line-2 bg-s2 px-[0.7rem] text-text focus:border-info focus:outline-none"
          />
          {ordered.length === 0 ? (
            <p className="m-0 mt-[0.6rem] text-[0.85rem] text-muted">{t('palette.noResults', { query: query.trim() })}</p>
          ) : (
            <div id={listId} role="listbox" className="mt-[0.6rem] flex max-h-[50vh] flex-col gap-[0.4rem] overflow-auto">
              {PALETTE_KINDS.map((kind) => {
                const group = ordered.filter((item) => item.kind === kind);
                if (group.length === 0) return null;
                return (
                  <div key={kind} role="group" aria-label={t(`palette.kinds.${kind}`)}>
                    <p className="section-label m-0 px-[0.4rem]">{t(`palette.kinds.${kind}`)}</p>
                    {group.map((item) => {
                      const selected = item === activeItem;
                      return (
                        <div
                          key={item.id}
                          id={optionId(item)}
                          role="option"
                          aria-selected={selected}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            choose(item);
                          }}
                          className={`flex cursor-pointer items-center justify-between rounded-[0.4rem] px-[0.6rem] py-[0.4rem] text-[0.9rem] ${selected ? 'bg-info/15 text-text' : 'hover:bg-s2'}`}
                        >
                          <span>{item.label}</span>
                          {item.hint && <span className="text-[0.75rem] text-muted">{item.hint}</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
}
