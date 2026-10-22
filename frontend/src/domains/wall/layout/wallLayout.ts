import type { LayoutBlock } from '@/domains/workspace/layout/grid';

/** BE-41 built-in `noc` layout (hero, also active, near limit, matrix, timeline). */
export const BUILT_IN_BLOCKS: readonly LayoutBlock[] = [
  { id: 'hero', kind: 'hero', x: 0, y: 0, w: 8, h: 6 },
  { id: 'also-active', kind: 'also-active', x: 8, y: 0, w: 4, h: 3 },
  { id: 'near-limit', kind: 'near-limit', x: 8, y: 3, w: 4, h: 3 },
  { id: 'matrix', kind: 'matrix', x: 0, y: 6, w: 8, h: 4 },
  { id: 'timeline', kind: 'timeline', x: 8, y: 6, w: 4, h: 4 },
];

const key = (b: LayoutBlock) => `${b.kind}:${b.x},${b.y},${b.w},${b.h}`;
const CLASSIC = new Set(BUILT_IN_BLOCKS.map(key));

/** The built-in arrangement keeps the hand-tuned 16:9 wall (docs/03 §3); anything else uses the grid. */
export function isClassicArrangement(blocks: readonly LayoutBlock[]): boolean {
  return blocks.length === CLASSIC.size && blocks.every((b) => CLASSIC.has(key(b)));
}

export function orderedBlocks(blocks: readonly LayoutBlock[]): LayoutBlock[] {
  return [...blocks].sort((a, b) => a.y - b.y || a.x - b.x);
}
