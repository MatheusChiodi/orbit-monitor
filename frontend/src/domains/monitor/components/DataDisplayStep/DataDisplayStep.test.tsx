import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FieldDisplay } from '@/shared/api/types';
import { renderWithLocale } from '@/test/renderWithLocale';
import { DataDisplayStep } from './DataDisplayStep';

const fields: FieldDisplay[] = [
  { field: 'PENDING_QTY', selected: true, label: 'Pending qty', format: 'integer', storeAsSeries: true, display: 'number' },
  { field: '[ROWS]', selected: false, label: 'Rows returned', format: 'integer', storeAsSeries: false, display: 'hidden' },
];

describe('DataDisplayStep', () => {
  it('a simple row: keep, friendly name, value now, show as', () => {
    render(<DataDisplayStep fields={fields} values={{ PENDING_QTY: 347 }} onChange={vi.fn()} />);
    const row = screen.getByRole('group', { name: 'Pending qty' });
    expect(within(row).getByRole('checkbox', { name: 'Keep Pending qty' })).toBeChecked();
    expect(within(row).getByText('347')).toBeInTheDocument();
    expect(within(row).getByRole('combobox', { name: 'Show as' })).toHaveValue('number');
    expect(within(row).queryByRole('combobox', { name: 'Format' })).toBeNull();
  });

  it('built-in values say so instead of showing the placeholder', () => {
    render(<DataDisplayStep fields={fields} onChange={vi.fn()} />);
    const row = screen.getByRole('group', { name: 'Rows returned' });
    expect(within(row).getByText('From built-in value')).toBeInTheDocument();
    expect(within(row).queryByText('[ROWS]')).toBeNull();
  });

  it('formatting opens on demand with name, format, unit and history chart', async () => {
    render(<DataDisplayStep fields={fields} onChange={vi.fn()} />);
    const toggle = screen.getByRole('button', { name: 'Formatting for Pending qty' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    const row = screen.getByRole('group', { name: 'Pending qty' });
    expect(within(row).getByRole('textbox', { name: 'Name' })).toHaveValue('Pending qty');
    expect(within(row).getByRole('combobox', { name: 'Format' })).toHaveValue('integer');
    expect(within(row).getByRole('checkbox', { name: 'Keep a history chart' })).toBeChecked();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<DataDisplayStep fields={fields} onChange={vi.fn()} />, 'pt-BR');
    const row = screen.getByRole('group', { name: 'Pending qty' });
    expect(within(row).getByRole('checkbox', { name: 'Guardar Pending qty' })).toBeChecked();
    expect(within(row).getByRole('option', { name: 'Medidor' })).toBeInTheDocument();
    expect(screen.getByText('1 de 2 guardados')).toBeInTheDocument();
  });

  it('an unchecked value disables its display choice', () => {
    render(<DataDisplayStep fields={fields} onChange={vi.fn()} />);
    const row = screen.getByRole('group', { name: 'Rows returned' });
    expect(within(row).getByRole('combobox', { name: 'Show as' })).toBeDisabled();
  });

  it('renames the value and changes the display', async () => {
    const onChange = vi.fn();
    render(<DataDisplayStep fields={fields} onChange={onChange} />);
    const row = screen.getByRole('group', { name: 'Pending qty' });
    fireEvent.change(within(row).getByRole('combobox', { name: 'Show as' }), { target: { value: 'gauge' } });
    expect(onChange).toHaveBeenLastCalledWith([{ ...fields[0], display: 'gauge' }, fields[1]]);
    await userEvent.click(screen.getByRole('button', { name: 'Formatting for Pending qty' }));
    fireEvent.change(within(row).getByRole('textbox', { name: 'Name' }), { target: { value: 'Pending' } });
    expect(onChange).toHaveBeenLastCalledWith([{ ...fields[0], label: 'Pending' }, fields[1]]);
  });

  it('checking a value keeps it', () => {
    const onChange = vi.fn();
    render(<DataDisplayStep fields={fields} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Keep Rows returned' }));
    expect(onChange).toHaveBeenLastCalledWith([fields[0], { ...fields[1], selected: true }]);
  });

  it('shows how many values are kept', () => {
    render(<DataDisplayStep fields={fields} onChange={vi.fn()} />);
    expect(screen.getByText('1 of 2 kept')).toBeInTheDocument();
  });
});
