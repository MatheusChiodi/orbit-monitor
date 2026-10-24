import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { nextRovingIndex } from '../popover/roving';

export interface TabItem<V extends string> {
  value: V;
  label: ReactNode;
  /** Panel content; omit when the caller renders the panel (e.g. route-driven tabs). */
  content?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps<V extends string> {
  label: string;
  items: readonly TabItem<V>[];
  value: V;
  onChange: (value: V) => void;
  className?: string;
}

/** Tabs switch between views of the same thing; arrows, Home and End move and activate. */
export function Tabs<V extends string>({ label, items, value, onChange, className = '' }: TabsProps<V>) {
  const baseId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.max(0, items.findIndex((item) => item.value === value));
  const active = items[current];
  // On phones the tablist scrolls sideways: keep the selected tab visible.
  useEffect(() => {
    refs.current[current]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [current]);
  const onKeyDown = (event: KeyboardEvent) => {
    const next = nextRovingIndex(event, current, items.map((item) => Boolean(item.disabled)));
    if (next === null) return;
    event.preventDefault();
    onChange(items[next]!.value);
    refs.current[next]?.focus();
  };
  const tabId = (v: string) => `${baseId}-tab-${v}`;
  const panelId = (v: string) => `${baseId}-panel-${v}`;
  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex gap-1 overflow-x-auto border-b border-line">
        {items.map((item, i) => {
          const selected = item.value === value;
          return (
            <button
              key={item.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={tabId(item.value)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={item.content !== undefined ? panelId(item.value) : undefined}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => onChange(item.value)}
              className={`-mb-px h-9 shrink-0 border-b-2 px-3 text-base font-medium whitespace-nowrap transition-colors duration-120 disabled:opacity-40 ${
                selected ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {active?.content !== undefined && (
        <div role="tabpanel" id={panelId(active.value)} aria-labelledby={tabId(active.value)} tabIndex={0} className="pt-4 focus-visible:outline-offset-4">
          {active.content}
        </div>
      )}
    </div>
  );
}
