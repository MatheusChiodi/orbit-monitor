import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Condition } from '@/shared/api/types';
import { renderWithLocale } from '@/test/renderWithLocale';
import type { EvaluationContext } from '../../conditions';
import { ConditionEditor } from './ConditionEditor';

const fields = ['QTY', '[ROWS]'];
const context: EvaluationContext = { row: { QTY: 347 }, rowCount: 1, elapsedMs: 20, now: new Date() };
const qty: Condition = { field: 'QTY', operator: '<', value: '200', level: 'DOWN' };

describe('ConditionEditor', () => {
  it('every row has field · operator · value · level', () => {
    render(<ConditionEditor conditions={[qty]} fields={fields} context={context} onChange={vi.fn()} />);
    const row = screen.getByRole('group', { name: 'Condition 1' });
    expect(within(row).getByRole('combobox', { name: 'Field' })).toHaveValue('QTY');
    expect(within(row).getByRole('combobox', { name: 'Operator' })).toHaveValue('<');
    expect(within(row).getByRole('textbox', { name: 'Value' })).toHaveValue('200');
    expect(within(row).getByRole('combobox', { name: 'Level' })).toHaveValue('DOWN');
  });

  it('warns that the condition would fail now against the preview', () => {
    render(<ConditionEditor conditions={[qty]} fields={fields} context={context} onChange={vi.fn()} />);
    expect(screen.getByText('This condition would fail now (DOWN)')).toBeInTheDocument();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<ConditionEditor conditions={[qty]} fields={fields} context={context} onChange={vi.fn()} />, 'pt-BR');
    const row = screen.getByRole('group', { name: 'Condição 1' });
    expect(within(row).getByRole('combobox', { name: 'Nível' })).toHaveValue('DOWN');
    expect(screen.getByText('Essa condição falharia agora (FORA)')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'mais recente que' })).toBeInTheDocument();
  });

  it('shows that it passes now', () => {
    render(<ConditionEditor conditions={[{ ...qty, value: '500' }]} fields={fields} context={context} onChange={vi.fn()} />);
    expect(screen.getByText('Passes with the current result')).toBeInTheDocument();
  });

  it('shows a validation error', () => {
    render(<ConditionEditor conditions={[{ ...qty, value: '' }]} fields={fields} context={context} onChange={vi.fn()} />);
    expect(screen.getByText('Enter a value')).toBeInTheDocument();
  });

  it('edits value and level', () => {
    const onChange = vi.fn();
    render(<ConditionEditor conditions={[qty]} fields={fields} context={context} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Value' }), { target: { value: '300' } });
    expect(onChange).toHaveBeenLastCalledWith([{ ...qty, value: '300' }]);
    fireEvent.change(screen.getByRole('combobox', { name: 'Level' }), { target: { value: 'WARN' } });
    expect(onChange).toHaveBeenLastCalledWith([{ ...qty, level: 'WARN' }]);
  });

  it('adds and removes conditions', async () => {
    const onChange = vi.fn();
    render(<ConditionEditor conditions={[qty]} fields={fields} context={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add condition' }));
    expect(onChange).toHaveBeenLastCalledWith([qty, { field: 'QTY', operator: '<', value: '', level: 'WARN' }]);
    await userEvent.click(screen.getByRole('button', { name: 'Remove condition 1' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('no live result without a preview', () => {
    render(<ConditionEditor conditions={[qty]} fields={fields} context={null} onChange={vi.fn()} />);
    expect(screen.queryByText(/would fail now/)).toBeNull();
  });
});
