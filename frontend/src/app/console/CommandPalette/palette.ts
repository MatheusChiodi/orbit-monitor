export type PaletteKind = 'monitor' | 'incident' | 'group' | 'page' | 'layout' | 'action';

export interface PaletteItem {
  id: string;
  kind: PaletteKind;
  label: string;
  hint?: string;
  /** Hidden in view-only mode. */
  requiresEdit?: boolean;
}

/** Display order of the result groups. */
export const PALETTE_KINDS: PaletteKind[] = ['monitor', 'incident', 'group', 'page', 'layout', 'action'];

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/** Accent- and case-insensitive search over label and hint; prefix matches rank first. */
export function searchPalette(items: readonly PaletteItem[], query: string): PaletteItem[] {
  const needle = normalize(query.trim());
  if (!needle) return [...items];
  const scored: { item: PaletteItem; score: number; index: number }[] = [];
  items.forEach((item, index) => {
    const label = normalize(item.label);
    const hint = normalize(item.hint ?? '');
    let score = -1;
    if (label.startsWith(needle)) score = 0;
    else if (label.split(/\s+/).some((word) => word.startsWith(needle))) score = 1;
    else if (label.includes(needle)) score = 2;
    else if (hint.includes(needle)) score = 3;
    if (score >= 0) scored.push({ item, score, index });
  });
  return scored.sort((a, b) => a.score - b.score || a.index - b.index).map((s) => s.item);
}

/** Results grouped in display order, flattened (the order arrow keys follow). */
export function orderPalette(items: readonly PaletteItem[], mode: 'edit' | 'view-only', query: string): PaletteItem[] {
  const visible = searchPalette(
    items.filter((item) => mode === 'edit' || !item.requiresEdit),
    query,
  );
  return PALETTE_KINDS.flatMap((kind) => visible.filter((item) => item.kind === kind));
}
