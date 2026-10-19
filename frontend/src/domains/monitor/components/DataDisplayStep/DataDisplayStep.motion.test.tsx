import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FieldDisplay } from '@/shared/api/types';
import { entersAnimated, flushMotion, isStatic, renderWithMotion } from '@/test/motion';
import { DataDisplayStep } from './DataDisplayStep';

const qty: FieldDisplay = { field: 'QTY', selected: true, label: 'Qty', format: 'integer', storeAsSeries: true, display: 'number' };
const rows: FieldDisplay = { field: '[ROWS]', selected: false, label: 'Rows', format: 'integer', storeAsSeries: false, display: 'hidden' };

function step(fields: FieldDisplay[]) {
  return <DataDisplayStep fields={fields} onChange={vi.fn()} />;
}

describe('FE-51 DataDisplayStep motion', () => {
  it('standard: field rows enter as list items', () => {
    renderWithMotion(step([qty, rows]), 'standard');
    const row = screen.getByRole('group', { name: 'QTY' });
    expect(row).toHaveAttribute('data-motion', 'listItem');
    expect(row).toHaveAttribute('data-motion-level', 'standard');
    expect(entersAnimated(row)).toBe(true);
  });

  it('off: static', () => {
    renderWithMotion(step([qty, rows]), 'off');
    expect(isStatic(screen.getByRole('group', { name: 'QTY' }))).toBe(true);
  });

  it('a removed field leaves through AnimatePresence in standard', async () => {
    const { rerender } = renderWithMotion(step([qty, rows]), 'standard');
    rerender(step([qty]));
    expect(screen.queryByRole('group', { name: '[ROWS]' })).not.toBeNull();
    await flushMotion(500);
    expect(screen.queryByRole('group', { name: '[ROWS]' })).toBeNull();
  });

  it('the stored-fields counter swaps in place with a flash', () => {
    const { rerender } = renderWithMotion(step([qty, rows]), 'standard');
    rerender(step([qty, { ...rows, selected: true }]));
    expect(screen.getByText('2 of 2 fields will be stored')).toHaveAttribute('data-flash', 'up');
  });

  it('prefers-reduced-motion forces off', () => {
    renderWithMotion(step([qty]), 'expressive', 'en', { reducedMotion: true });
    expect(screen.getByRole('group', { name: 'QTY' })).toHaveAttribute('data-motion-level', 'off');
  });
});
