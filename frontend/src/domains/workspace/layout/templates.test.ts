import { describe, expect, it } from 'vitest';
import { GRID_COLUMNS, collides } from './grid';
import { LAYOUT_TEMPLATES, templateById } from './templates';

describe('FE-16 layout templates', () => {
  it('ships NOC, Executive, Team and Single incident', () => {
    expect(LAYOUT_TEMPLATES.map((t) => t.id)).toEqual(['noc', 'executive', 'team', 'single-incident']);
  });

  it('every template has an i18n name key and fits the 12-column grid without overlaps', () => {
    for (const template of LAYOUT_TEMPLATES) {
      expect(template.nameKey).toMatch(/^layout\.templates\./);
      for (const b of template.blocks) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(GRID_COLUMNS);
      }
      const overlaps = template.blocks.some((a) => template.blocks.some((b) => a.id !== b.id && collides(a, b)));
      expect(overlaps).toBe(false);
    }
  });

  it('NOC mirrors the default wall: hero, also active, near threshold, matrix, timeline', () => {
    const kinds = templateById('noc')?.blocks.map((b) => b.kind);
    expect(kinds).toEqual(['hero', 'also-active', 'near-limit', 'matrix', 'timeline']);
  });

  it('Single incident gives the hero the whole width', () => {
    const hero = templateById('single-incident')?.blocks.find((b) => b.kind === 'hero');
    expect(hero?.w).toBe(GRID_COLUMNS);
  });

  it('templates never include personal-data blocks (the wall shows no personal data)', () => {
    for (const template of LAYOUT_TEMPLATES) {
      expect(template.blocks.some((b) => b.kind === 'live-table' && b.allowPersonalData)).toBe(false);
    }
  });

  it('unknown template id → undefined', () => {
    expect(templateById('nope')).toBeUndefined();
  });

  it('returns copies so editing a layout does not change the template', () => {
    const a = templateById('noc');
    a?.blocks.pop();
    expect(templateById('noc')?.blocks).toHaveLength(5);
  });
});
