import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { Condition } from '@/shared/api/types';
import { renderWithLocale } from '@/test/renderWithLocale';
import type { EvaluationContext } from '../../conditions';
import { conditionsToText, parseConditionsText } from '../../conditions/conditionText';
import type { ConditionField } from '../ConditionEditor';
import { ConditionBuilder } from './ConditionBuilder';

const fields: ConditionField[] = [
  { key: 'PENDING_QTY', label: 'Pending qty', kind: 'number' },
  { key: 'LAST_BATCH_AT', label: 'Last batch at', kind: 'date' },
  { key: '[ROWS]', label: 'Rows returned', kind: 'number' },
];
const context: EvaluationContext = { row: { PENDING_QTY: 347 }, rowCount: 1, elapsedMs: 20, now: new Date() };
const initial: Condition[] = [{ field: 'PENDING_QTY', operator: '<', value: '200', level: 'DOWN' }];

function Controlled() {
  const [conditions, setConditions] = useState<Condition[]>(initial);
  return (
    <>
      <ConditionBuilder conditions={conditions} fields={fields} context={context} onChange={setConditions} />
      <output data-testid="state">{JSON.stringify(conditions)}</output>
    </>
  );
}

describe('FE-34 condition builder', () => {
  describe('text format (pure)', () => {
    it('writes one condition per line with its level', () => {
      expect(conditionsToText(initial)).toBe('[COL].PENDING_QTY < 200 → DOWN');
    });

    it('parses the text back, including system fields and dates', () => {
      const parsed = parseConditionsText('[COL].PENDING_QTY < 200 → DOWN\n[ROWS] == 0 → WARN\n[COL].LAST_BATCH_AT newer than 10min → WARN');
      expect(parsed.errors).toEqual([]);
      expect(parsed.conditions).toEqual([
        { field: 'PENDING_QTY', operator: '<', value: '200', level: 'DOWN' },
        { field: '[ROWS]', operator: '==', value: '0', level: 'WARN' },
        { field: 'LAST_BATCH_AT', operator: 'newer_than', value: '10min', level: 'WARN' },
      ]);
    });

    it('reports the line of a syntax error', () => {
      const parsed = parseConditionsText('[COL].A < 1 → DOWN\nnonsense');
      expect(parsed.errors).toEqual([{ line: 2, key: 'conditions.errors.syntax' }]);
    });
  });

  it('shows rules as sentences and opens the text on demand', async () => {
    render(<Controlled />);
    expect(screen.getByText('Down when Pending qty is at least 200')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Edit as text' }));
    expect(screen.getByRole('textbox', { name: 'Conditions as text' })).toHaveValue('[COL].PENDING_QTY < 200 → DOWN');
  });

  it('editing the text updates the rules (kept in sync)', async () => {
    render(<Controlled />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit as text' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Conditions as text' }), { target: { value: '[COL].PENDING_QTY < 500 → WARN' } });
    await userEvent.click(screen.getByRole('button', { name: 'Edit with fields' }));
    expect(screen.getByRole('textbox', { name: 'Limit' })).toHaveValue('500');
    expect(screen.getByRole('combobox', { name: 'Level' })).toHaveValue('WARN');
  });

  it('invalid text keeps the last valid conditions and shows the error line', async () => {
    render(<Controlled />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit as text' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Conditions as text' }), { target: { value: 'oops' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Line 1: cannot read this condition');
    expect(screen.getByTestId('state')).toHaveTextContent('"value":"200"');
  });

  it('"would fail now" works in both modes', async () => {
    render(<Controlled />);
    expect(screen.getByText('This condition would fail now (Down)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Edit as text' }));
    expect(screen.getByText('1 condition would fail now')).toBeInTheDocument();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<ConditionBuilder conditions={initial} fields={fields} context={context} onChange={() => {}} />, 'pt-BR');
    expect(screen.getByRole('button', { name: 'Editar como texto' })).toBeInTheDocument();
    expect(screen.getByText('Fora quando Pending qty for pelo menos 200')).toBeInTheDocument();
  });
});
