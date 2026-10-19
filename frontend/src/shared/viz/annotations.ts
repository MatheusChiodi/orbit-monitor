import { safeText } from '@/shared/privacy';

export type AnnotationKind = 'incident' | 'maintenance' | 'deploy';

/** FE-26 marker on a time chart; maintenance windows carry `until`. */
export interface ChartAnnotation {
  id: string;
  kind: AnnotationKind;
  at: string;
  until?: string;
  title: string;
}

/** Annotations visible in `[from, to]`, oldest first, windows clipped to the range, titles redacted. */
export function annotationsInRange(list: readonly ChartAnnotation[], from: string, to: string): ChartAnnotation[] {
  const start = Date.parse(from);
  const end = Date.parse(to);
  return list
    .filter((a) => Date.parse(a.at) <= end && Date.parse(a.until ?? a.at) >= start)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .map((a) => {
      const clipped: ChartAnnotation = { ...a, title: safeText(a.title) };
      if (Date.parse(a.at) < start) clipped.at = from;
      if (a.until !== undefined && Date.parse(a.until) > end) clipped.until = to;
      return clipped;
    });
}
