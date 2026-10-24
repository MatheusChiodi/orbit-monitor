import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button, type ButtonProps } from '../Button/Button';
import { IconMore, type IconComponent } from '../icons';
import { useAnchoredStyle } from '../popover/anchor';
import { nextRovingIndex } from '../popover/roving';

export interface MenuItem {
  id: string;
  label: ReactNode;
  onSelect: () => void;
  icon?: IconComponent;
  /** Destructive action: red text (the confirmation dialog carries the danger button). */
  danger?: boolean;
  disabled?: boolean;
}

export interface MenuProps {
  /** Accessible name of the button and the menu, e.g. "Actions for Orbit health". */
  label: string;
  items: readonly MenuItem[];
  /** Button content; defaults to the "…" icon. */
  trigger?: ReactNode;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  align?: 'start' | 'end';
  className?: string;
}

/** Button + popover list for secondary actions ("…"). Arrow keys, Home/End, Enter, Esc. */
export function Menu({ label, items, trigger, variant = 'ghost', size = 'md', align = 'end', className = '' }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const style = useAnchoredStyle(button, open, align === 'end' ? 'bottom-end' : 'bottom-start');
  const disabled = items.map((item) => Boolean(item.disabled));

  const openAt = (index: number | null) => {
    setActive(index ?? 0);
    setOpen(true);
  };
  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  };

  useEffect(() => {
    if (open) itemRefs.current[active]?.focus();
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent | MouseEvent) => {
      const target = event.target as Node;
      if (!list.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const firstEnabled = () => nextRovingIndex({ key: 'Home' }, 0, disabled, 'vertical');
  const lastEnabled = () => nextRovingIndex({ key: 'End' }, 0, disabled, 'vertical');

  const onButtonKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openAt(event.key === 'ArrowDown' ? firstEnabled() : lastEnabled());
    }
  };

  const onListKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    const next = nextRovingIndex(event, active, disabled, 'vertical');
    if (next !== null) {
      event.preventDefault();
      setActive(next);
    }
  };

  const select = (item: MenuItem) => {
    close(true);
    item.onSelect();
  };

  return (
    <>
      <Button
        ref={button}
        variant={variant}
        size={size}
        iconOnly={trigger === undefined}
        aria-label={trigger === undefined ? label : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : openAt(firstEnabled()))}
        onKeyDown={onButtonKeyDown}
        className={className}
      >
        {trigger ?? <IconMore size={size === 'sm' ? 16 : 20} />}
      </Button>
      {open &&
        createPortal(
          <div
            ref={list}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onListKeyDown}
            style={style}
            className="ui-pop z-50 flex min-w-44 flex-col rounded-md border border-line-2 bg-s2 p-1 shadow-popover"
          >
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={i === active ? 0 : -1}
                  disabled={item.disabled}
                  onClick={() => select(item)}
                  onMouseEnter={() => !item.disabled && setActive(i)}
                  className={`flex h-8 items-center gap-2 rounded-sm px-2.5 text-left text-base whitespace-nowrap focus:bg-s3 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 pointer-coarse:h-11 ${
                    item.danger ? 'text-down-text' : 'text-text'
                  }`}
                >
                  {Icon && <Icon className="text-muted" />}
                  {item.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
