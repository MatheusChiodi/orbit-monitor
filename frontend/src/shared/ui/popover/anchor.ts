import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

export type Placement = 'bottom-start' | 'bottom-end' | 'top' | 'bottom';

const GAP = 6;
const MARGIN = 8;

/**
 * Fixed position next to an anchor, rendered in a portal so panels with overflow-hidden never clip it.
 * Re-measures on scroll and resize while open; flips above when there is no room below.
 */
export function useAnchoredStyle(anchor: RefObject<HTMLElement | null>, open: boolean, placement: Placement): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', top: 0, left: 0 });
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = anchor.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const roomBelow = vh - r.bottom;
      const above = placement === 'top' || (roomBelow < 160 && r.top > roomBelow);
      const next: CSSProperties = { position: 'fixed' };
      if (above) next.bottom = vh - r.top + GAP;
      else next.top = r.bottom + GAP;
      if (placement === 'bottom-end') next.right = Math.max(MARGIN, vw - r.right);
      else if (placement === 'bottom-start') next.left = Math.max(MARGIN, r.left);
      else {
        next.left = r.left + r.width / 2;
        next.transform = 'translateX(-50%)';
      }
      next.transformOrigin = `${placement === 'bottom-end' ? 'right' : placement === 'bottom-start' ? 'left' : 'center'} ${above ? 'bottom' : 'top'}`;
      setStyle(next);
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [anchor, open, placement]);
  return style;
}
