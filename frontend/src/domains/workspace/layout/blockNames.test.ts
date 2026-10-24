import { describe, expect, it } from 'vitest';
import { createI18n } from '@/shared/i18n/i18n';
import { BLOCK_KINDS } from './blockKinds';
import { blockDescription, blockName } from './blockNames';
import { LAYOUT_TEMPLATES } from './templates';

describe('FE-72 human block names', () => {
  const t = createI18n('en').getFixedT('en');

  it('every block kind has a name and a one-line description in en and pt-BR', () => {
    const pt = createI18n('pt-BR').getFixedT('pt-BR');
    for (const kind of BLOCK_KINDS) {
      for (const tr of [t, pt]) {
        expect(blockName(tr, { id: kind, kind }, [])).not.toContain('settingsHub');
        expect(blockDescription(tr, { kind })).not.toContain('settingsHub');
      }
    }
  });

  it('every template has a name and a description', () => {
    for (const template of LAYOUT_TEMPLATES) {
      expect(t(`settingsHub.templates.${template.id}.name`)).not.toContain('settingsHub');
      expect(t(`settingsHub.templates.${template.id}.description`)).not.toContain('settingsHub');
    }
  });

  it('uses the kind name instead of the id, numbering only repeated kinds', () => {
    const blocks = [
      { id: 'hero', kind: 'hero' as const },
      { id: 'series-1', kind: 'series' as const },
      { id: 'series-2', kind: 'series' as const },
    ];
    expect(blockName(t, blocks[0]!, blocks)).toBe('Main status');
    expect(blockName(t, blocks[2]!, blocks)).toBe('History chart 2');
  });
});
