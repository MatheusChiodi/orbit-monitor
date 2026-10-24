import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Condition } from '@/shared/api/types';
import { renderWithLocale } from '@/test/renderWithLocale';
import type { EvaluationContext } from '../../conditions';
import { ConditionEditor, type ConditionField } from './ConditionEditor';

const fields: ConditionField[] = [
  { key: 'QTY', label: 'Qty', kind: 'number' },
  { key: '[RESPONSE_TIME]', label: 'Response time', kind: 'duration' },
  { key: '$.status', label: 'Status', kind: 'text' },
];
const context: EvaluationContext = { row: { QTY: 347 }, rowCount: 1, elapsedMs: 20, now: new Date() };
/** Stored as the healthy state: "QTY < 200" means "Down when Qty is at least 200". */
const qty: Condition = { field: 'QTY', operator: '<', value: '200', level: 'DOWN' };

describe('ConditionEditor', () => {
  it('every rule reads "<level> when <value> <comparison> <limit>"', () => {
    render(<ConditionEditor conditions={[qty]} fields={fields} context={context} onChange={vi.fn()} />);
    const row = screen.getByRole('group', { name: 'Rule 1' });
    expect(within(row).getByRole('combobox', { name: 'Level' })).toHaveValue('DOWN');
    expect(within(row).getByRole('combobox', { name: 'Value' })).toHaveValue('QTY');
    expect(within(row).getByRole('combobox', { name: 'Comparison' })).toHaveValue('>=');
    expect(within(row).getByRole('textbox', { name: 'Limit' })).toHaveValue('200');
    expect(within(row).getByText('Down when Qty is at least 200')).toBeInTheDocument();
  });

  it('stores the inverse of the alert comparison', () => {
    const onChange = vi.fn();
    render(<ConditionEditor conditions={[qty]} fields={fields} context={context} onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Comparison' }), { target: { value: '>' } });
    expect(onChange).toHaveBeenLastCalledWith([{ ...qty, operator: '<=' }]);
  });

  it('offers only comparisons that fit the value type', () => {
    render(<ConditionEditor conditions={[{ field: '$.status', operator: '==', value: 'UP', level: 'DOWN' }]} fields={fields} context={null} onChange={vi.fn()} />);
    const options = within(screen.getByRole('combobox', { name: 'Comparison' })).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['is not', 'is', 'is not one of']);
    expect(screen.getByText('Down when Status is not UP')).toBeInTheDocument();
  });

  it('a range has two inputs and reads as a sentence with the unit', () => {
    const onChange = vi.fn();
    const slow: Condition = { field: '[RESPONSE_TIME]', operator: 'between', value: '100 and 900', level: 'WARN' };
    render(<ConditionEditor conditions={[slow]} fields={fields} context={null} onChange={onChange} />);
    expect(screen.getByText('Warning when Response time is outside 100 ms to 900 ms')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'To' }), { target: { value: '1200' } });
    expect(onChange).toHaveBeenLastCalledWith([{ ...slow, value: '100 and 1200' }]);
  });

  it('warns that the rule would fire now against the preview', () => {
    render(<ConditionEditor conditions={[qty]} fields={fields} context={context} onChange={vi.fn()} />);
    expect(screen.getByText('This condition would fail now (Down)')).toBeInTheDocument();
  });

  it('shows that it passes now', () => {
    render(<ConditionEditor conditions={[{ ...qty, value: '500' }]} fields={fields} context={context} onChange={vi.fn()} />);
    expect(screen.getByText('Passes with the current result')).toBeInTheDocument();
  });

  it('shows a validation error', () => {
    render(<ConditionEditor conditions={[{ ...qty, value: '' }]} fields={fields} context={context} onChange={vi.fn()} />);
    expect(screen.getByText('Enter a value')).toBeInTheDocument();
  });

  it('adds a Down rule on a value not used yet, and removes rules', async () => {
    const onChange = vi.fn();
    render(<ConditionEditor conditions={[qty]} fields={fields} context={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add rule' }));
    expect(onChange).toHaveBeenLastCalledWith([qty, { field: '[RESPONSE_TIME]', operator: '<=', value: '', level: 'DOWN' }]);
    await userEvent.click(screen.getByRole('button', { name: 'Remove rule 1' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('says why a rule cannot be added yet', () => {
    render(<ConditionEditor conditions={[]} fields={[]} context={null} onChange={vi.fn()} addDisabledReason="Run a preview first to pick a value to watch." />);
    expect(screen.getByRole('button', { name: 'Add rule' })).toBeDisabled();
    expect(screen.getByText('Run a preview first to pick a value to watch.')).toBeInTheDocument();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<ConditionEditor conditions={[qty]} fields={fields} context={context} onChange={vi.fn()} />, 'pt-BR');
    const row = screen.getByRole('group', { name: 'Regra 1' });
    expect(within(row).getByRole('combobox', { name: 'Nível' })).toHaveValue('DOWN');
    expect(screen.getByRole('option', { name: 'for pelo menos' })).toBeInTheDocument();
  });
});
