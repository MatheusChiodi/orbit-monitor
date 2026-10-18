import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WallHeader } from './WallHeader';

const now = new Date(2026, 9, 18, 17, 4, 9);
const counts = { down: 1, warn: 2, ok: 17, total: 20 };

describe('WallHeader', () => {
  it('mostra marca, ambiente e frase do estado global em região aria-live', () => {
    render(<WallHeader environment="Produção" counts={counts} now={now} updatedAt={now.toISOString()} connection="open" />);
    expect(screen.getByText('Orbit')).toBeInTheDocument();
    expect(screen.getByText('Produção')).toBeInTheDocument();
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('1 monitor fora');
  });

  it('mostra os três contadores', () => {
    render(<WallHeader environment="Produção" counts={counts} now={now} updatedAt={null} connection="open" />);
    expect(screen.getByText('1 fora')).toBeInTheDocument();
    expect(screen.getByText('2 atenção')).toBeInTheDocument();
    expect(screen.getByText('17 ok')).toBeInTheDocument();
  });

  it('mostra relógio e "atualizado agora"', () => {
    render(<WallHeader environment="P" counts={counts} now={now} updatedAt={now.toISOString()} connection="open" />);
    expect(screen.getByText('17:04:09')).toBeInTheDocument();
    expect(screen.getByText('atualizado agora')).toBeInTheDocument();
  });

  it('avisa quando está em modo demonstração ou desconectado', () => {
    const { rerender } = render(<WallHeader environment="P" counts={counts} now={now} updatedAt={null} connection="mock" />);
    expect(screen.getByText('dados de demonstração')).toBeInTheDocument();
    rerender(<WallHeader environment="P" counts={counts} now={now} updatedAt={null} connection="closed" />);
    expect(screen.getByText('reconectando')).toBeInTheDocument();
  });

  it('atualiza o título da aba', () => {
    render(<WallHeader environment="P" counts={counts} now={now} updatedAt={null} connection="open" />);
    expect(document.title).toBe('(3) Orbit');
  });

  it('botão de tela cheia', async () => {
    const onFullscreen = vi.fn();
    render(
      <WallHeader environment="P" counts={counts} now={now} updatedAt={null} connection="open" onFullscreen={onFullscreen} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Tela cheia' }));
    expect(onFullscreen).toHaveBeenCalled();
  });

  it('"Tudo operacional" quando não há problemas', () => {
    render(
      <WallHeader environment="P" counts={{ down: 0, warn: 0, ok: 5, total: 5 }} now={now} updatedAt={null} connection="open" />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Tudo operacional');
  });
});
