import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { entersAnimated, flushMotion, isStatic, renderWithMotion } from '@/test/motion';
import { SqlCodeEditor } from './SqlCodeEditor';

const catalog = { tables: [] };

describe('FE-51 SqlCodeEditor motion', () => {
  it('standard: the safe-mode error enters animated', () => {
    const { rerender } = renderWithMotion(<SqlCodeEditor catalog={catalog} value="SELECT 1" onChange={vi.fn()} />, 'standard');
    rerender(<SqlCodeEditor catalog={catalog} value="DELETE FROM x" onChange={vi.fn()} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('data-motion-level', 'standard');
    expect(entersAnimated(alert)).toBe(true);
  });

  it('standard: the error leaves through AnimatePresence once the SQL is fixed', async () => {
    const { rerender } = renderWithMotion(<SqlCodeEditor catalog={catalog} value="DELETE FROM x" onChange={vi.fn()} />, 'standard');
    rerender(<SqlCodeEditor catalog={catalog} value="SELECT 1" onChange={vi.fn()} />);
    expect(screen.queryByRole('alert')).not.toBeNull();
    await flushMotion(500);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('off: error appears and disappears without motion', async () => {
    const { rerender } = renderWithMotion(<SqlCodeEditor catalog={catalog} value="DELETE FROM x" onChange={vi.fn()} />, 'off');
    expect(isStatic(screen.getByRole('alert'))).toBe(true);
    rerender(<SqlCodeEditor catalog={catalog} value="SELECT 1" onChange={vi.fn()} />);
    await flushMotion();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('guard chips are static badges that enter with the editor', () => {
    renderWithMotion(<SqlCodeEditor catalog={catalog} value="" onChange={vi.fn()} />, 'standard');
    expect(entersAnimated(screen.getByText('SELECT only'))).toBe(true);
  });

  it('prefers-reduced-motion forces off', () => {
    renderWithMotion(<SqlCodeEditor catalog={catalog} value="DELETE FROM x" onChange={vi.fn()} />, 'expressive', 'en', { reducedMotion: true });
    expect(screen.getByRole('alert')).toHaveAttribute('data-motion-level', 'off');
  });
});
