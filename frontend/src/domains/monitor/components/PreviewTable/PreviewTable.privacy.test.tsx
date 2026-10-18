import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { domContains, groupedPan, makeCpf, makePan } from '@/test/sensitive';
import { PreviewTable } from './PreviewTable';

const pan = makePan();
const cpf = makeCpf();

const preview = {
  columns: [
    { name: 'ORDER_ID', type: 'text' as const },
    { name: 'CARD', type: 'text' as const },
    { name: 'CVV', type: 'text' as const },
    { name: 'CUSTOMER_DOC', type: 'text' as const },
    { name: 'NOTE', type: 'text' as const },
  ],
  rows: [{ ORDER_ID: 'A1', CARD: groupedPan(pan), CVV: '123', CUSTOMER_DOC: cpf, NOTE: `retry card ${pan}` }],
  elapsedMs: 40,
};

describe('CORE-16 PreviewTable privacy', () => {
  it('a valid PAN in a cell or in free text never reaches the DOM', () => {
    const { container } = render(<PreviewTable preview={preview} />);
    expect(domContains(container, pan)).toBe(false);
    expect(screen.getAllByText(new RegExp(`•••• •••• •••• ${pan.slice(-4)}`)).length).toBe(2);
  });

  it('SAD columns show [REDACTED] and CPF keeps only the check digits', () => {
    const { container } = render(<PreviewTable preview={preview} />);
    expect(screen.getByText('[REDACTED]')).toBeInTheDocument();
    expect(domContains(container, cpf.replace(/\D/g, ''))).toBe(false);
    expect(screen.getByText(`•••.•••.•••-${cpf.slice(-2)}`)).toBeInTheDocument();
  });

  it('shows the PCI notice when the result contains card data', () => {
    render(<PreviewTable preview={preview} />);
    expect(screen.getByRole('note')).toHaveTextContent('Card data is always masked (PCI DSS)');
  });
});
