import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FieldDisplay } from '@/shared/api/types';
import { DataDisplayStep } from './DataDisplayStep';

const fields: FieldDisplay[] = [
  { field: 'QTD_PENDENTES', selected: true, label: 'Qtd pendentes', format: 'integer', storeAsSeries: true, display: 'number' },
  { field: '[ROWS]', selected: false, label: 'Linhas', format: 'integer', storeAsSeries: false, display: 'hidden' },
];

describe('DataDisplayStep', () => {
  it('lista os campos com rótulo, formato, unidade, série e exibição', () => {
    render(<DataDisplayStep fields={fields} onChange={vi.fn()} />);
    const row = screen.getByRole('group', { name: 'QTD_PENDENTES' });
    expect(within(row).getByRole('checkbox', { name: 'Guardar QTD_PENDENTES' })).toBeChecked();
    expect(within(row).getByRole('textbox', { name: 'Rótulo' })).toHaveValue('Qtd pendentes');
    expect(within(row).getByRole('combobox', { name: 'Formato' })).toHaveValue('integer');
    expect(within(row).getByRole('textbox', { name: 'Unidade' })).toHaveValue('');
    expect(within(row).getByRole('checkbox', { name: 'Guardar como série' })).toBeChecked();
    expect(within(row).getByRole('combobox', { name: 'Exibição' })).toHaveValue('number');
  });

  it('campo não marcado desabilita a configuração', () => {
    render(<DataDisplayStep fields={fields} onChange={vi.fn()} />);
    const row = screen.getByRole('group', { name: '[ROWS]' });
    expect(within(row).getByRole('textbox', { name: 'Rótulo' })).toBeDisabled();
  });

  it('renomeia o rótulo e troca a exibição', () => {
    const onChange = vi.fn();
    render(<DataDisplayStep fields={fields} onChange={onChange} />);
    const row = screen.getByRole('group', { name: 'QTD_PENDENTES' });
    fireEvent.change(within(row).getByRole('textbox', { name: 'Rótulo' }), { target: { value: 'Pendentes' } });
    expect(onChange).toHaveBeenLastCalledWith([{ ...fields[0], label: 'Pendentes' }, fields[1]]);
    fireEvent.change(within(row).getByRole('combobox', { name: 'Exibição' }), { target: { value: 'gauge' } });
    expect(onChange).toHaveBeenLastCalledWith([{ ...fields[0], display: 'gauge' }, fields[1]]);
  });

  it('marcar um campo o seleciona', () => {
    const onChange = vi.fn();
    render(<DataDisplayStep fields={fields} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Guardar [ROWS]' }));
    expect(onChange).toHaveBeenLastCalledWith([fields[0], { ...fields[1], selected: true }]);
  });

  it('mostra a contagem de campos guardados', () => {
    render(<DataDisplayStep fields={fields} onChange={vi.fn()} />);
    expect(screen.getByText('1 de 2 campos serão guardados')).toBeInTheDocument();
  });
});
