import { describe, expect, it } from 'vitest';
import { createI18n } from '@/shared/i18n/i18n';
import { INTRO_IDS, INTROS } from '../../../../remotion/compositions/registry';
import { introProps, readPalette } from './introProps';

describe('FE-52 intro props', () => {
  it('every composition is registered with a duration and defaults', () => {
    expect(INTRO_IDS).toEqual(['orbit-boot', 'check-flow', 'first-monitor']);
    for (const id of INTRO_IDS) expect(INTROS[id].durationInFrames).toBeGreaterThan(0);
  });

  it('English and Brazilian Portuguese text come from i18n', () => {
    const en = createI18n('en').t;
    const pt = createI18n('pt-BR').t;
    const palette = readPalette();
    expect(introProps('check-flow', en, palette).heading).toBe('How a check flows');
    expect(introProps('check-flow', pt, palette).heading).toBe('Como uma checagem flui');
    expect(introProps('check-flow', pt, palette).steps.map((s) => s.detail)).toContain('FORA');
    expect(introProps('check-flow', pt, palette).steps.map((s) => s.detail)).toContain('regra QTY < 200');
    expect(introProps('first-monitor', pt, palette).steps[0]).toBe('Cole uma URL ou um SELECT');
    expect(introProps('orbit-boot', en, palette).title).toBe('Orbit');
  });

  it('the palette follows the theme tokens', () => {
    document.documentElement.style.setProperty('--info', '#123456');
    expect(readPalette().blue).toBe('#123456');
    document.documentElement.style.removeProperty('--info');
    expect(readPalette().blue).toBe('#3b9eff');
  });
});
