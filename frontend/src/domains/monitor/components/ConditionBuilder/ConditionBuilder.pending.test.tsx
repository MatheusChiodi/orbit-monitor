import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { Condition } from '@/shared/api/types';
import { renderWithLocale } from '@/test/renderWithLocale';
import type { EvaluationContext } from '../../conditions';
import { conditionsToText, parseConditionsText } from '../../conditions/conditionText';
import { ConditionBuilder } from './ConditionBuilder';

const fields = ['PENDING_QTY', 'LAST_BATCH_AT', '[ROWS]'];
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

    it('parses the text back, including system fields and older than', () => {
      const parsed = parseConditionsText('[COL].PENDING_QTY < 200 → DOWN\n[ROWS] == 0 → WARN\n[COL].LAST_BATCH_AT older than 10min → WARN');
      expect(parsed.errors).toEqual([]);
      expect(parsed.conditions).toEqual([
        { field: 'PENDING_QTY', operator: '<', value: '200', level: 'DOWN' },
        { field: '[ROWS]', operator: '==', value: '0', level: 'WARN' },
        { field: 'LAST_BATCH_AT', operator: 'older_than', value: '10min', level: 'WARN' },
      ]);
    });

    it('reports the line of a syntax error', () => {
      const parsed = parseConditionsText('[COL].A < 1 → DOWN\nnonsense');
      expect(parsed.errors).toEqual([{ line: 2, key: 'conditions.errors.syntax' }]);
    });
  });

  it('switches between visual and text modes with tabs', async () => {
    render(<Controlled />);
    expect(screen.getByRole('tab', { name: 'Visual' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: 'Text' }));
    expect(screen.getByRole('textbox', { name: 'Conditions as text' })).toHaveValue('[COL].PENDING_QTY < 200 → DOWN');
  });

  it('editing the text updates the visual rows (kept in sync)', async () => {
    render(<Controlled />);
    await userEvent.click(screen.getByRole('tab', { name: 'Text' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Conditions as text' }), {
      target: { value: '[COL].PENDING_QTY < 500 → WARN' },
    });
    await userEvent.click(screen.getByRole('tab', { name: 'Visual' }));
    expect(screen.getByRole('textbox', { name: 'Value' })).toHaveValue('500');
    expect(screen.getByRole('combobox', { name: 'Level' })).toHaveValue('WARN');
  });

  it('invalid text keeps the last valid conditions and shows the error line', async () => {
    render(<Controlled />);
    await userEvent.click(screen.getByRole('tab', { name: 'Text' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Conditions as text' }), { target: { value: 'oops' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Line 1: cannot read this condition');
    expect(screen.getByTestId('state')).toHaveTextContent('"value":"200"');
  });

  it('"would fail now" works in both modes', async () => {
    render(<Controlled />);
    expect(screen.getByText('This condition would fail now (DOWN)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Text' }));
    expect(screen.getByText('1 condition would fail now')).toBeInTheDocument();
  });

  it('arrow keys move between tabs', async () => {
    render(<Controlled />);
    screen.getByRole('tab', { name: 'Visual' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Text' })).toHaveFocus();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<ConditionBuilder conditions={initial} fields={fields} context={context} onChange={() => {}} />, 'pt-BR');
    expect(screen.getByRole('tab', { name: 'Texto' })).toBeInTheDocument();
  });
});
