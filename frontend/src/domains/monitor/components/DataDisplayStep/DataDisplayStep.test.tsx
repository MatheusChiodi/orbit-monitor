import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FieldDisplay } from '@/shared/api/types';
import { renderWithLocale } from '@/test/renderWithLocale';
import { DataDisplayStep } from './DataDisplayStep';

const fields: FieldDisplay[] = [
  { field: 'PENDING_QTY', selected: true, label: 'Pending qty', format: 'integer', storeAsSeries: true, display: 'number' },
  { field: '[ROWS]', selected: false, label: 'Rows', format: 'integer', storeAsSeries: false, display: 'hidden' },
];

describe('DataDisplayStep', () => {
  it('lists fields with label, format, unit, series and display', () => {
    render(<DataDisplayStep fields={fields} onChange={vi.fn()} />);
    const row = screen.getByRole('group', { name: 'PENDING_QTY' });
    expect(within(row).getByRole('checkbox', { name: 'Store PENDING_QTY' })).toBeChecked();
    expect(within(row).getByRole('textbox', { name: 'Label' })).toHaveValue('Pending qty');
    expect(within(row).getByRole('combobox', { name: 'Format' })).toHaveValue('integer');
    expect(within(row).getByRole('textbox', { name: 'Unit' })).toHaveValue('');
    expect(within(row).getByRole('checkbox', { name: 'Store as series' })).toBeChecked();
    expect(within(row).getByRole('combobox', { name: 'Display' })).toHaveValue('number');
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<DataDisplayStep fields={fields} onChange={vi.fn()} />, 'pt-BR');
    const row = screen.getByRole('group', { name: 'PENDING_QTY' });
    expect(within(row).getByRole('checkbox', { name: 'Guardar PENDING_QTY' })).toBeChecked();
    expect(within(row).getByRole('option', { name: 'Medidor' })).toBeInTheDocument();
    expect(screen.getByText('1 de 2 campos serão guardados')).toBeInTheDocument();
  });

  it('an unchecked field disables its settings', () => {
    render(<DataDisplayStep fields={fields} onChange={vi.fn()} />);
    const row = screen.getByRole('group', { name: '[ROWS]' });
    expect(within(row).getByRole('textbox', { name: 'Label' })).toBeDisabled();
  });

  it('renames the label and changes the display', () => {
    const onChange = vi.fn();
    render(<DataDisplayStep fields={fields} onChange={onChange} />);
    const row = screen.getByRole('group', { name: 'PENDING_QTY' });
    fireEvent.change(within(row).getByRole('textbox', { name: 'Label' }), { target: { value: 'Pending' } });
    expect(onChange).toHaveBeenLastCalledWith([{ ...fields[0], label: 'Pending' }, fields[1]]);
    fireEvent.change(within(row).getByRole('combobox', { name: 'Display' }), { target: { value: 'gauge' } });
    expect(onChange).toHaveBeenLastCalledWith([{ ...fields[0], display: 'gauge' }, fields[1]]);
  });

  it('checking a field selects it', () => {
    const onChange = vi.fn();
    render(<DataDisplayStep fields={fields} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Store [ROWS]' }));
    expect(onChange).toHaveBeenLastCalledWith([fields[0], { ...fields[1], selected: true }]);
  });

  it('shows how many fields will be stored', () => {
    render(<DataDisplayStep fields={fields} onChange={vi.fn()} />);
    expect(screen.getByText('1 of 2 fields will be stored')).toBeInTheDocument();
  });
});
