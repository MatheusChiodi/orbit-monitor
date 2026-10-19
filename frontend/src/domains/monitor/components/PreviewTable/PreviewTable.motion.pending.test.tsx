import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PreviewResult } from '@/shared/api/types';
import { entersAnimated, flushMotion, isStatic, renderWithMotion } from '@/test/motion';
import { PreviewTable } from './PreviewTable';

const preview: PreviewResult = {
  columns: [
    { name: 'ACQUIRER', type: 'text' },
    { name: 'ERROR_QTY', type: 'number' },
  ],
  rows: [
    { ACQUIRER: 'Cielo', ERROR_QTY: 12 },
    { ACQUIRER: 'Rede', ERROR_QTY: 3 },
  ],
  elapsedMs: 182,
};

function row(text: string) {
  return screen.getByText(text).closest('tr') as HTMLElement;
}

describe('FE-51 PreviewTable motion', () => {
  it('standard: rows enter as list items', () => {
    renderWithMotion(<PreviewTable preview={preview} />, 'standard');
    const tr = row('Cielo');
    expect(tr).toHaveAttribute('data-motion', 'listItem');
    expect(tr).toHaveAttribute('data-motion-level', 'standard');
    expect(entersAnimated(tr)).toBe(true);
  });

  it('off: static rows', () => {
    renderWithMotion(<PreviewTable preview={preview} />, 'off');
    expect(isStatic(row('Cielo'))).toBe(true);
  });

  it('a new run replaces rows with a cross-fade (old rows leave through AnimatePresence)', async () => {
    const { rerender } = renderWithMotion(<PreviewTable preview={preview} />, 'standard');
    rerender(<PreviewTable preview={{ ...preview, rows: [{ ACQUIRER: 'Stone', ERROR_QTY: 1 }] }} />);
    expect(screen.queryByText('Rede')).not.toBeNull();
    await flushMotion(500);
    expect(screen.queryByText('Rede')).toBeNull();
  });

  it('off: the swap is immediate', async () => {
    const { rerender } = renderWithMotion(<PreviewTable preview={preview} />, 'off');
    rerender(<PreviewTable preview={{ ...preview, rows: [{ ACQUIRER: 'Stone', ERROR_QTY: 1 }] }} />);
    await flushMotion();
    expect(screen.queryByText('Rede')).toBeNull();
  });

  it('prefers-reduced-motion forces off', () => {
    renderWithMotion(<PreviewTable preview={preview} />, 'expressive', 'en', { reducedMotion: true });
    expect(row('Cielo')).toHaveAttribute('data-motion-level', 'off');
    expect(isStatic(row('Cielo'))).toBe(true);
  });
});
