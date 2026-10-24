import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Condition } from '@/shared/api/types';
import { entersAnimated, flushMotion, isStatic, renderWithMotion } from '@/test/motion';
import type { EvaluationContext } from '../../conditions';
import { ConditionEditor, type ConditionField } from './ConditionEditor';

const fields: ConditionField[] = [
  { key: 'QTY', label: 'Qty', kind: 'number' },
  { key: '[ROWS]', label: 'Rows returned', kind: 'number' },
];
const context: EvaluationContext = { row: { QTY: 347 }, rowCount: 1, elapsedMs: 20, now: new Date() };
const a: Condition = { field: 'QTY', operator: '<', value: '200', level: 'DOWN' };
const b: Condition = { field: '[ROWS]', operator: '==', value: '1', level: 'WARN' };

function editor(conditions: Condition[]) {
  return <ConditionEditor conditions={conditions} fields={fields} context={context} onChange={vi.fn()} />;
}

describe('FE-51 ConditionEditor motion', () => {
  it('standard: a new row enters as a list item', () => {
    const { rerender } = renderWithMotion(editor([a]), 'standard');
    rerender(editor([a, b]));
    const row = screen.getByRole('group', { name: 'Rule 2' });
    expect(row).toHaveAttribute('data-motion', 'listItem');
    expect(entersAnimated(row)).toBe(true);
  });

  it('off: rows are static', () => {
    const { rerender } = renderWithMotion(editor([a]), 'off');
    rerender(editor([a, b]));
    expect(isStatic(screen.getByRole('group', { name: 'Rule 2' }))).toBe(true);
  });

  it('a removed row leaves through AnimatePresence in standard, immediately in off', async () => {
    const std = renderWithMotion(editor([a, b]), 'standard');
    std.rerender(editor([a]));
    expect(screen.queryByRole('group', { name: 'Rule 2' })).not.toBeNull();
    await flushMotion(500);
    expect(screen.queryByRole('group', { name: 'Rule 2' })).toBeNull();
    std.unmount();
    const off = renderWithMotion(editor([a, b]), 'off');
    off.rerender(editor([a]));
    await flushMotion();
    expect(screen.queryByRole('group', { name: 'Rule 2' })).toBeNull();
  });

  it('the live verdict cross-fades between "would fail" and "passes"', () => {
    const { rerender } = renderWithMotion(editor([a]), 'standard');
    rerender(editor([{ ...a, value: '500' }]));
    expect(screen.queryByText('This condition would fail now (Down)')).not.toBeNull();
    expect(screen.getByText('Passes with the current result')).toBeInTheDocument();
  });

  it('prefers-reduced-motion forces off', () => {
    renderWithMotion(editor([a]), 'expressive', 'en', { reducedMotion: true });
    expect(screen.getByRole('group', { name: 'Rule 1' })).toHaveAttribute('data-motion-level', 'off');
  });
});
