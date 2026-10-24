import { cloneElement, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredStyle } from '../popover/anchor';

interface TriggerProps {
  'aria-describedby'?: string;
  onMouseEnter?: (event: React.MouseEvent) => void;
  onMouseLeave?: (event: React.MouseEvent) => void;
  onFocus?: (event: React.FocusEvent) => void;
  onBlur?: (event: React.FocusEvent) => void;
  ref?: React.Ref<HTMLElement>;
}

export interface TooltipProps {
  /** Supplementary text only; never the only place an action's name lives. */
  content: ReactNode;
  /** One focusable element (button, link). */
  children: ReactElement<TriggerProps>;
  side?: 'top' | 'bottom';
  /** Hover delay in ms; keyboard focus shows it at once. */
  delay?: number;
}

/** Last time any tooltip closed: hovering the next one within this window skips the delay. */
let lastClosed = 0;
const SKIP_DELAY_MS = 400;

export function Tooltip({ content, children, side = 'top', delay = 500 }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const anchor = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const style = useAnchoredStyle(anchor, open, side);

  const show = (wait: number) => {
    clearTimeout(timer.current);
    if (wait <= 0 || Date.now() - lastClosed < SKIP_DELAY_MS) setOpen(true);
    else timer.current = setTimeout(() => setOpen(true), wait);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setOpen((was) => {
      if (was) lastClosed = Date.now();
      return false;
    });
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const props = children.props;
  const trigger = cloneElement(children, {
    ref: (el: HTMLElement | null) => {
      anchor.current = el;
    },
    'aria-describedby': [props['aria-describedby'], open ? id : null].filter(Boolean).join(' ') || undefined,
    onMouseEnter: (e: React.MouseEvent) => {
      props.onMouseEnter?.(e);
      show(delay);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      props.onMouseLeave?.(e);
      hide();
    },
    onFocus: (e: React.FocusEvent) => {
      props.onFocus?.(e);
      show(0);
    },
    onBlur: (e: React.FocusEvent) => {
      props.onBlur?.(e);
      hide();
    },
  });

  return (
    <>
      {trigger}
      {open &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            style={style}
            className="ui-pop pointer-events-none z-50 max-w-xs rounded-sm border border-line-2 bg-s3 px-2 py-1 text-sm text-text shadow-popover"
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
