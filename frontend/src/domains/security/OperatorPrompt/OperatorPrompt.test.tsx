import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { OperatorPrompt } from './OperatorPrompt';

describe('OperatorPrompt', () => {
  it('asks once for the operator name and submits it', async () => {
    const onSubmit = vi.fn();
    render(<OperatorPrompt onSubmit={onSubmit} />);
    expect(screen.getByRole('heading', { name: 'What name should appear on your actions?' })).toBeInTheDocument();
    expect(screen.getByText('Saved on this device only. It is self-declared, not a login.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Operator name'), 'M. Chiodi');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onSubmit).toHaveBeenCalledWith('M. Chiodi');
  });

  it('requires a name', async () => {
    const onSubmit = vi.fn();
    render(<OperatorPrompt onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a name');
  });

  it('prefills the current name when changing it', () => {
    render(<OperatorPrompt initialName="Ana" onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Operator name')).toHaveValue('Ana');
  });

  it('has no password field (there is no login)', () => {
    const { container } = render(<OperatorPrompt onSubmit={vi.fn()} />);
    expect(container.querySelector('input[type="password"]')).toBeNull();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<OperatorPrompt onSubmit={vi.fn()} />, 'pt-BR');
    expect(screen.getByLabelText('Nome do operador')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();
  });
});
