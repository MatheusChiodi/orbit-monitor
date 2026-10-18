import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { HistoryNotice } from './HistoryNotice';

describe('CORE-20 history window notice (no Orbit database)', () => {
  it('states the available window', () => {
    render(<HistoryNotice windowHours={24} />);
    expect(screen.getByRole('note')).toHaveTextContent('History available: last 24 h');
  });

  it('warns when the requested period is longer than the window', () => {
    render(<HistoryNotice windowHours={24} requestedHours={24 * 30} />);
    expect(screen.getByRole('note')).toHaveTextContent('History available: last 24 h');
    expect(screen.getByRole('note')).toHaveTextContent('30 d requested; older data is not kept');
  });

  it('explains that history restarts with Orbit', () => {
    render(<HistoryNotice windowHours={24} coverageHours={3} />);
    expect(screen.getByRole('note')).toHaveTextContent('Only 3 h recorded since Orbit started');
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<HistoryNotice windowHours={24} requestedHours={24 * 7} />, 'pt-BR');
    expect(screen.getByRole('note')).toHaveTextContent('Histórico disponível: últimas 24 h');
    expect(screen.getByRole('note')).toHaveTextContent('7 d solicitados; dados mais antigos não são guardados');
  });
});
