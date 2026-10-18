import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('envia usuário e senha', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Usuário'), 'ana');
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(onSubmit).toHaveBeenCalledWith({ username: 'ana', password: 'segredo' });
  });

  it('exige os dois campos', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Informe usuário e senha');
  });

  it('mostra o erro do servidor', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Usuário ou senha inválidos'));
    render(<LoginForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Usuário'), 'ana');
    await userEvent.type(screen.getByLabelText('Senha'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário ou senha inválidos');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });

  it('oferece modo demonstração quando disponível', async () => {
    const onDemo = vi.fn();
    render(<LoginForm onSubmit={vi.fn()} onDemo={onDemo} />);
    await userEvent.click(screen.getByRole('button', { name: 'Entrar em modo demonstração' }));
    expect(onDemo).toHaveBeenCalled();
  });
});
