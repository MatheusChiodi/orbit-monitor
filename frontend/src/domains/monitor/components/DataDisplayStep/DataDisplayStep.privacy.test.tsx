import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FieldDisplay } from '@/shared/api/types';
import { domContains, makePan } from '@/test/sensitive';
import { renderWithLocale } from '@/test/renderWithLocale';
import { DataDisplayStep } from './DataDisplayStep';

const pan = makePan();

const fields: FieldDisplay[] = [
  { field: 'CARD', selected: true, label: 'Card', format: 'text', storeAsSeries: false, display: 'text', dataClass: 'PCI_PAN', masked: true },
  { field: 'CUSTOMER_EMAIL', selected: true, label: 'E-mail', format: 'text', storeAsSeries: false, display: 'text', dataClass: 'PERSONAL', masked: true },
  { field: 'PENDING_QTY', selected: true, label: 'Pending', format: 'integer', storeAsSeries: true, display: 'number', dataClass: null, masked: false },
];

describe('CORE-16 Data & display privacy badges', () => {
  it('PCI fields show "PCI · masked" and cannot be stored as series nor unmasked', () => {
    render(<DataDisplayStep fields={fields} onChange={vi.fn()} />);
    const row = screen.getByRole('group', { name: 'CARD' });
    expect(within(row).getByText('PCI · masked')).toBeInTheDocument();
    const series = within(row).getByRole('checkbox', { name: 'Store as series' });
    expect(series).not.toBeChecked();
    expect(series).toBeDisabled();
    const mask = within(row).getByRole('checkbox', { name: 'Masked' });
    expect(mask).toBeChecked();
    expect(mask).toBeDisabled();
  });

  it('PERSONAL fields show "Personal data (LGPD)" and are masked by default', () => {
    render(<DataDisplayStep fields={fields} onChange={vi.fn()} />);
    const row = screen.getByRole('group', { name: 'CUSTOMER_EMAIL' });
    expect(within(row).getByText('Personal data (LGPD)')).toBeInTheDocument();
    expect(within(row).getByRole('checkbox', { name: 'Masked' })).toBeChecked();
  });

  it('personal and card fields cannot be shown on the wall', () => {
    render(<DataDisplayStep fields={fields} onChange={vi.fn()} />);
    for (const name of ['CARD', 'CUSTOMER_EMAIL']) {
      const row = screen.getByRole('group', { name });
      expect(within(row).getByRole('checkbox', { name: 'Show on the wall' })).toBeDisabled();
    }
  });

  it('a PCI field ignores attempts to enable series', () => {
    const onChange = vi.fn();
    render(<DataDisplayStep fields={fields} onChange={onChange} />);
    fireEvent.click(within(screen.getByRole('group', { name: 'CARD' })).getByRole('checkbox', { name: 'Store as series' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a PAN typed into a label is shown masked', () => {
    const { container } = render(<DataDisplayStep fields={[{ ...fields[2]!, label: `Card ${pan}` }]} onChange={vi.fn()} />);
    expect(domContains(container, pan)).toBe(false);
  });

  it('notices in pt-BR', () => {
    renderWithLocale(<DataDisplayStep fields={fields} onChange={vi.fn()} />, 'pt-BR');
    expect(screen.getByText('PCI · mascarado')).toBeInTheDocument();
    expect(screen.getByText('Dado pessoal (LGPD)')).toBeInTheDocument();
    expect(screen.getByText('Dados de cartão são sempre mascarados (PCI DSS)')).toBeInTheDocument();
  });
});
