import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { AccessMode } from '@/shared/api/types';
import { Dialog, IconSearch } from '@/shared/ui';
import { PALETTE_KINDS, orderPalette, type PaletteItem } from './palette';

export interface CommandPaletteProps {
  items: readonly PaletteItem[];
  mode: AccessMode;
  onSelect: (item: PaletteItem) => void;
  /** Controlled open state (the top bar's search button); uncontrolled when omitted. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

/** FE-28 / FE-63: `Ctrl+K` / `⌘K` opens a searchable list of monitors, incidents, pages and actions. */
export function CommandPalette({ items, mode, onSelect, open: controlled, onOpenChange, defaultOpen = false }: CommandPaletteProps) {
  const { t } = useTranslation();
  const listId = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = controlled ?? uncontrolled;
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const setOpen = useCallback((next: boolean) => {
    setUncontrolled(next);
    onOpenChangeRef.current?.(next);
  }, []);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  const ordered = orderPalette(items, mode, query);

  function close() {
    setOpen(false);
    setQuery('');
    setActive(-1);
  }

  function choose(item: PaletteItem) {
    close();
    onSelect(item);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, ordered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = ordered[active] ?? ordered[0];
      if (item) choose(item);
    }
  }

  const optionId = (item: PaletteItem) => `${listId}-${item.id}`;
  const activeItem = ordered[active];

  return (
    <Dialog open={open} onClose={close} title={t('palette.title')} initialFocus={input} size="md">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <IconSearch size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            ref={input}
            role="combobox"
            aria-label={t('palette.search')}
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeItem ? optionId(activeItem) : undefined}
            placeholder={t('palette.placeholder')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(-1);
            }}
            onKeyDown={onKeyDown}
            className="h-11 w-full rounded-sm border border-line-2 bg-s2 pr-3 pl-9 text-md text-text placeholder:text-dim"
          />
        </div>
        {ordered.length === 0 ? (
          <p className="m-0 px-1 py-4 text-base text-muted">{t('palette.noResults', { query: query.trim() })}</p>
        ) : (
          <div id={listId} role="listbox" aria-label={t('palette.results')} className="-mx-1 flex max-h-96 flex-col gap-3 overflow-y-auto">
            {PALETTE_KINDS.map((kind) => {
              const group = ordered.filter((item) => item.kind === kind);
              if (group.length === 0) return null;
              return (
                <div key={kind} role="group" aria-label={t(`palette.kinds.${kind}`)}>
                  <p aria-hidden className="section-label m-0 px-2 pb-1">
                    {t(`palette.kinds.${kind}`)}
                  </p>
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
                        onMouseMove={() => setActive(ordered.indexOf(item))}
                        className={`flex min-h-9 cursor-pointer items-center justify-between gap-3 rounded-sm px-2 text-base ${selected ? 'bg-s3 text-text' : 'text-text'}`}
                      >
                        <span className="min-w-0 truncate">{item.label}</span>
                        {item.hint && <span className="shrink-0 text-sm text-muted">{item.hint}</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
        <p className="m-0 flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-1 pt-3 text-xs text-dim">
          <span>
            <kbd className="font-mono">↑ ↓</kbd> {t('palette.keys.move')}
          </span>
          <span>
            <kbd className="font-mono">Enter</kbd> {t('palette.keys.open')}
          </span>
          <span>
            <kbd className="font-mono">Esc</kbd> {t('palette.keys.close')}
          </span>
        </p>
      </div>
    </Dialog>
  );
}
