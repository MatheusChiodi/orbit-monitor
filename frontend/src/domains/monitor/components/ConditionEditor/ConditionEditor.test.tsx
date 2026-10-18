import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Condition } from '@/shared/api/types';
import type { EvaluationContext } from '../../conditions';
import { ConditionEditor } from './ConditionEditor';

const fields = ['QTD', '[ROWS]'];
const context: EvaluationContext = { row: { QTD: 347 }, rowCount: 1, elapsedMs: 20, now: new Date() };
const qtd: Condition = { field: 'QTD', operator: '<', value: '200', level: 'DOWN' };

describe('ConditionEditor', () => {
  it('cada linha tem campo · operador · valor · nível', () => {
    render(<ConditionEditor conditions={[qtd]} fields={fields} context={context} onChange={vi.fn()} />);
    const row = screen.getByRole('group', { name: 'Condição 1' });
    expect(within(row).getByRole('combobox', { name: 'Campo' })).toHaveValue('QTD');
    expect(within(row).getByRole('combobox', { name: 'Operador' })).toHaveValue('<');
    expect(within(row).getByRole('textbox', { name: 'Valor' })).toHaveValue('200');
    expect(within(row).getByRole('combobox', { name: 'Nível' })).toHaveValue('DOWN');
  });

  it('avisa que a condição falharia agora contra o preview', () => {
    render(<ConditionEditor conditions={[qtd]} fields={fields} context={context} onChange={vi.fn()} />);
    expect(screen.getByText('Essa condição falharia agora (FORA)')).toBeInTheDocument();
  });

  it('mostra que passa agora', () => {
    render(
      <ConditionEditor conditions={[{ ...qtd, value: '500' }]} fields={fields} context={context} onChange={vi.fn()} />,
    );
    expect(screen.getByText('Passa com o resultado atual')).toBeInTheDocument();
  });

  it('mostra erro de validação', () => {
    render(<ConditionEditor conditions={[{ ...qtd, value: '' }]} fields={fields} context={context} onChange={vi.fn()} />);
    expect(screen.getByText('Informe um valor')).toBeInTheDocument();
  });

  it('edita valor e nível', () => {
    const onChange = vi.fn();
    render(<ConditionEditor conditions={[qtd]} fields={fields} context={context} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Valor' }), { target: { value: '300' } });
    expect(onChange).toHaveBeenLastCalledWith([{ ...qtd, value: '300' }]);
    fireEvent.change(screen.getByRole('combobox', { name: 'Nível' }), { target: { value: 'WARN' } });
    expect(onChange).toHaveBeenLastCalledWith([{ ...qtd, level: 'WARN' }]);
  });

  it('adiciona e remove condições', async () => {
    const onChange = vi.fn();
    render(<ConditionEditor conditions={[qtd]} fields={fields} context={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar condição' }));
    expect(onChange).toHaveBeenLastCalledWith([qtd, { field: 'QTD', operator: '<', value: '', level: 'WARN' }]);
    await userEvent.click(screen.getByRole('button', { name: 'Remover condição 1' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('sem preview não mostra resultado ao vivo', () => {
    render(<ConditionEditor conditions={[qtd]} fields={fields} context={null} onChange={vi.fn()} />);
    expect(screen.queryByText(/falharia agora/)).toBeNull();
  });
});
