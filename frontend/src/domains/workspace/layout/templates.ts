import type { LayoutBlock } from './grid';

export interface LayoutTemplate {
  id: 'noc' | 'executive' | 'team' | 'single-incident';
  nameKey: 'layout.templates.noc' | 'layout.templates.executive' | 'layout.templates.team' | 'layout.templates.single-incident';
  blocks: LayoutBlock[];
}

/** FE-16: starting points for wall layouts (no block ever shows personal data). */
const TEMPLATES: LayoutTemplate[] = [
  {
    id: 'noc',
    nameKey: 'layout.templates.noc',
    blocks: [
      { id: 'hero', kind: 'hero', x: 0, y: 0, w: 7, h: 5 },
      { id: 'also-active', kind: 'also-active', x: 0, y: 5, w: 4, h: 4 },
      { id: 'near-limit', kind: 'near-limit', x: 4, y: 5, w: 3, h: 4 },
      { id: 'matrix', kind: 'matrix', x: 7, y: 0, w: 5, h: 5 },
      { id: 'timeline', kind: 'timeline', x: 7, y: 5, w: 5, h: 4 },
    ],
  },
  {
    id: 'executive',
    nameKey: 'layout.templates.executive',
    blocks: [
      { id: 'hero', kind: 'hero', x: 0, y: 0, w: 8, h: 4 },
      { id: 'uptime', kind: 'uptime', x: 8, y: 0, w: 4, h: 4 },
      { id: 'indicators', kind: 'indicators', x: 0, y: 4, w: 12, h: 3 },
    ],
  },
  {
    id: 'team',
    nameKey: 'layout.templates.team',
    blocks: [
      { id: 'hero', kind: 'hero', x: 0, y: 0, w: 6, h: 4 },
      { id: 'series', kind: 'series', x: 6, y: 0, w: 6, h: 4 },
      { id: 'matrix', kind: 'matrix', x: 0, y: 4, w: 8, h: 4 },
      { id: 'clock', kind: 'clock', x: 8, y: 4, w: 4, h: 4 },
    ],
  },
  {
    id: 'single-incident',
    nameKey: 'layout.templates.single-incident',
    blocks: [
      { id: 'hero', kind: 'hero', x: 0, y: 0, w: 12, h: 7 },
      { id: 'timeline', kind: 'timeline', x: 0, y: 7, w: 12, h: 3 },
    ],
  },
];

function copy(template: LayoutTemplate): LayoutTemplate {
  return { ...template, blocks: template.blocks.map((b) => ({ ...b })) };
}

export const LAYOUT_TEMPLATES: readonly LayoutTemplate[] = TEMPLATES.map(copy);

/** A fresh copy, so editing a layout never changes the template. */
export function templateById(id: string): LayoutTemplate | undefined {
  const found = TEMPLATES.find((t) => t.id === id);
  return found ? copy(found) : undefined;
}
