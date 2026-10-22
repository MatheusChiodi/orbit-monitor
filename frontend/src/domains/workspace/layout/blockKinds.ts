/** Block kinds of a wall layout (FE-11); kept apart from the grid logic so the wall can validate layouts cheaply. */
export const BLOCK_KINDS = [
  'hero',
  'also-active',
  'near-limit',
  'matrix',
  'timeline',
  'value',
  'indicators',
  'series',
  'live-table',
  'ranking',
  'uptime',
  'clock',
  'text',
] as const;

export type BlockKind = (typeof BLOCK_KINDS)[number];

export function isBlockKind(value: unknown): value is BlockKind {
  return typeof value === 'string' && (BLOCK_KINDS as readonly string[]).includes(value);
}
