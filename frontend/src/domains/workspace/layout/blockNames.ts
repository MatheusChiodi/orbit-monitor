import type { TFunction } from 'i18next';
import type { LayoutBlock } from './grid';

/**
 * Human name of a block ("Main status", "History chart 2"), never its raw id. A number is added only when
 * a layout holds several blocks of the same kind.
 */
export function blockName(t: TFunction, block: Pick<LayoutBlock, 'id' | 'kind'>, blocks: readonly Pick<LayoutBlock, 'id' | 'kind'>[]): string {
  const base = t(`settingsHub.blocks.${block.kind}.name`);
  const same = blocks.filter((b) => b.kind === block.kind);
  if (same.length < 2) return base;
  return `${base} ${same.findIndex((b) => b.id === block.id) + 1}`;
}

export function blockDescription(t: TFunction, block: Pick<LayoutBlock, 'kind'>): string {
  return t(`settingsHub.blocks.${block.kind}.description`);
}
