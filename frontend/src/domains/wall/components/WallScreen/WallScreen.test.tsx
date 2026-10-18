import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '../../mock';
import { WallScreen } from './WallScreen';

const now = new Date(2026, 9, 18, 17, 10, 0);

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

function renderWall(scenario: 'incident' | 'ok', onAcknowledge = vi.fn()) {
  return render(
    <WallScreen
      snapshot={mockSnapshot(scenario, now)}
      now={now}
      connection="open"
      freshEventIds={new Set()}
      onAcknowledge={onAcknowledge}
    />,
  );
}

describe('WallScreen', () => {
  it('com incidente: herói do pior problema e todos os blocos', () => {
    renderWall('incident');
    expect(screen.getByRole('heading', { name: 'Fila de conciliação' })).toBeInTheDocument();
    for (const name of ['Situação', 'Também ativos', 'Perto do limite', 'Todos os monitores', 'Linha do tempo']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('status')).toHaveTextContent('1 monitor fora');
  });

  it('tudo ok: herói calmo', () => {
    renderWall('ok');
    expect(screen.getByRole('heading', { name: 'Tudo operacional' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reconhecer' })).toBeNull();
  });

  it('Reconhecer repassa o id do incidente', async () => {
    const onAcknowledge = vi.fn();
    renderWall('incident', onAcknowledge);
    await userEvent.click(screen.getByRole('button', { name: 'Reconhecer' }));
    expect(onAcknowledge).toHaveBeenCalledWith('inc-conciliacao');
  });

  it('ordem dos blocos no DOM segue a ordem do celular', () => {
    renderWall('incident');
    const names = screen.getAllByRole('region').map((r) => r.getAttribute('aria-labelledby') && r.querySelector('h2')?.textContent);
    expect(names).toEqual(['Situação', 'Também ativos', 'Perto do limite', 'Todos os monitores', 'Linha do tempo']);
  });

  it('sem snapshot mostra carregando', () => {
    render(
      <WallScreen snapshot={null} now={now} connection="connecting" freshEventIds={new Set()} onAcknowledge={vi.fn()} />,
    );
    expect(screen.getByText('Carregando a parede…')).toBeInTheDocument();
  });
});
