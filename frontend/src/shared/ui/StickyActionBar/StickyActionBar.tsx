import { useLayoutEffect, useRef, type ReactNode } from 'react';

export interface StickyActionBarProps {
  /** Actions, right-aligned: secondary first, one primary last ("Save changes"). */
  children: ReactNode;
  /** Short line on the left: "Unsaved changes", validation summary. */
  status?: ReactNode;
  className?: string;
}

const HEIGHT_VAR = '--sticky-bar-height';

/** Form footer that stays in view; publishes its height so toasts sit above it. */
export function StickyActionBar({ children, status, className = '' }: StickyActionBarProps) {
  const bar = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = bar.current;
    if (!el) return;
    const root = document.documentElement;
    const publish = () => root.style.setProperty(HEIGHT_VAR, `${Math.ceil(el.getBoundingClientRect().height)}px`);
    publish();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(publish) : null;
    observer?.observe(el);
    return () => {
      observer?.disconnect();
      root.style.removeProperty(HEIGHT_VAR);
    };
  }, []);
  return (
    <div
      ref={bar}
      data-sticky-action-bar
      className={`sticky bottom-0 z-30 -mx-4 mt-6 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-t border-line bg-bg/92 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 ${className}`}
    >
      {status && <div className="mr-auto min-w-0 text-sm text-muted">{status}</div>}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
