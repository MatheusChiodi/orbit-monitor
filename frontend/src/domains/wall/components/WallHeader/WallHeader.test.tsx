import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { WallHeader } from './WallHeader';

const now = new Date(2026, 9, 18, 17, 4, 9);
const counts = { down: 1, warn: 2, ok: 17, total: 20 };

describe('WallHeader', () => {
  it('shows brand, environment and the global phrase in an aria-live region', () => {
    render(<WallHeader environment="Production" counts={counts} now={now} updatedAt={now.toISOString()} connection="open" />);
    expect(screen.getByText('Orbit')).toBeInTheDocument();
    expect(screen.getByText('Production')).toBeInTheDocument();
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('1 monitor down');
  });

  it('with no monitors: a neutral "No monitors yet" and no counters', () => {
    render(<WallHeader environment="Local" counts={{ down: 0, warn: 0, ok: 0, total: 0 }} now={now} updatedAt={null} connection="open" />);
    expect(screen.getByRole('status')).toHaveTextContent('No monitors yet');
    expect(screen.queryByText('All systems operational')).toBeNull();
    expect(screen.queryByText('0 down')).toBeNull();
  });

  it('shows the three counters', () => {
    render(<WallHeader environment="Production" counts={counts} now={now} updatedAt={null} connection="open" />);
    expect(screen.getByText('1 down')).toBeInTheDocument();
    expect(screen.getByText('2 warning')).toBeInTheDocument();
    expect(screen.getByText('17 ok')).toBeInTheDocument();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(
      <WallHeader environment="Produção" counts={counts} now={now} updatedAt={now.toISOString()} connection="mock" />,
      'pt-BR',
    );
    expect(screen.getByRole('status')).toHaveTextContent('1 monitor fora');
    expect(screen.getByText('1 fora')).toBeInTheDocument();
    expect(screen.getByText('2 atenção')).toBeInTheDocument();
    expect(screen.getByText('atualizado agora')).toBeInTheDocument();
    expect(screen.getByText('dados de demonstração')).toBeInTheDocument();
  });

  it('shows the clock and "updated now"', () => {
    render(<WallHeader environment="P" counts={counts} now={now} updatedAt={now.toISOString()} connection="open" />);
    expect(screen.getByText('17:04:09')).toBeInTheDocument();
    expect(screen.getByText('updated now')).toBeInTheDocument();
  });

  it('warns in demo mode or while disconnected', () => {
    const { rerender } = render(<WallHeader environment="P" counts={counts} now={now} updatedAt={null} connection="mock" />);
    expect(screen.getByText('demo data')).toBeInTheDocument();
    rerender(<WallHeader environment="P" counts={counts} now={now} updatedAt={null} connection="closed" />);
    expect(screen.getByText('reconnecting')).toBeInTheDocument();
  });

  it('updates the tab title', () => {
    render(<WallHeader environment="P" counts={counts} now={now} updatedAt={null} connection="open" />);
    expect(document.title).toBe('(3) Orbit');
  });

  it('fullscreen button', async () => {
    const onFullscreen = vi.fn();
    render(
      <WallHeader environment="P" counts={counts} now={now} updatedAt={null} connection="open" onFullscreen={onFullscreen} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fullscreen' }));
    expect(onFullscreen).toHaveBeenCalled();
  });

  it('"All systems operational" when there are no problems', () => {
    render(
      <WallHeader environment="P" counts={{ down: 0, warn: 0, ok: 5, total: 5 }} now={now} updatedAt={null} connection="open" />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('All systems operational');
  });

  it('a zero counter is dimmed (color only with meaning)', () => {
    render(<WallHeader environment="P" counts={{ down: 0, warn: 2, ok: 5, total: 7 }} now={now} updatedAt={null} connection="open" />);
    expect(screen.getByText('0 down').className).toContain('text-dim');
    const counters = screen.getByRole('list', { name: 'Count by state' });
    expect(within(counters).getByText('2 warning').className).toContain('text-warn-text');
  });
  it('FE-10: shows the workspace brand with a sanitized logo when the snapshot carries one', async () => {
    const logoSvg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="1" height="1"/></svg>';
    const { container } = render(
      <WallHeader environment="P" counts={counts} now={now} updatedAt={null} connection="open" brand={{ name: 'ACME', logoSvg }} />,
    );
    expect(await screen.findByRole('img', { name: 'ACME logo' })).toBeInTheDocument();
    expect(screen.getByTitle('ACME')).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/onload/);
  });
});
