import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusDot, StatusPill } from './StatusPill';

describe('StatusPill', () => {
  it('sempre mostra o rótulo do estado (nunca só cor)', () => {
    render(<StatusPill status="DOWN" />);
    expect(screen.getByText('FORA')).toBeInTheDocument();
  });

  it('aceita um texto próprio', () => {
    render(<StatusPill status="OK">Tudo operacional</StatusPill>);
    expect(screen.getByText('Tudo operacional')).toBeInTheDocument();
  });

  it('ponto pisca só em vermelho', () => {
    const { rerender, container } = render(<StatusPill status="DOWN" />);
    expect(container.querySelector('.anim-blink')).not.toBeNull();
    rerender(<StatusPill status="WARN" />);
    expect(container.querySelector('.anim-blink')).toBeNull();
  });

  it('expõe data-status', () => {
    render(<StatusPill status="WARN" />);
    expect(screen.getByText('ATENÇÃO').closest('[data-status]')).toHaveAttribute('data-status', 'WARN');
  });
});

describe('StatusDot', () => {
  it('tem rótulo acessível do estado', () => {
    render(<StatusDot status="OK" />);
    expect(screen.getByRole('img', { name: 'OK' })).toBeInTheDocument();
  });
  it('pisca quando pedido', () => {
    const { container } = render(<StatusDot status="DOWN" blink />);
    expect(container.querySelector('.anim-blink')).not.toBeNull();
  });
});
