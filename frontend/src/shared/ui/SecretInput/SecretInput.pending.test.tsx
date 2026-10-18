import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { SecretInput } from './SecretInput';

describe('CORE-16 secret inputs', () => {
  it('is a password field with autocomplete off and no "show" toggle', () => {
    render(<SecretInput label="Password" onChange={vi.fn()} />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('a stored secret comes back only as "•••• (vault)"', () => {
    render(<SecretInput label="Password" stored onChange={vi.fn()} />);
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(screen.getByText('•••• (vault)')).toBeInTheDocument();
  });

  it('pt-BR shows "•••• (cofre)"', () => {
    renderWithLocale(<SecretInput label="Senha" stored onChange={vi.fn()} />, 'pt-BR');
    expect(screen.getByText('•••• (cofre)')).toBeInTheDocument();
  });

  it('emits the typed value without keeping it in the DOM after submit', async () => {
    const onChange = vi.fn();
    render(<SecretInput label="Password" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Password'), 'p4ss');
    expect(onChange).toHaveBeenLastCalledWith('p4ss');
    expect(screen.getByLabelText('Password').getAttribute('value') ?? '').not.toContain('p4ss');
  });
});
