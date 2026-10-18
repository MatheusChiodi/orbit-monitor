import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PreviewTable } from './PreviewTable';

const preview = {
  columns: [
    { name: 'ADQUIRENTE', type: 'text' as const },
    { name: 'QTD_ERRO', type: 'number' as const },
  ],
  rows: [
    { ADQUIRENTE: 'Cielo', QTD_ERRO: 12 },
    { ADQUIRENTE: 'Rede', QTD_ERRO: null },
  ],
  elapsedMs: 182,
};

describe('PreviewTable', () => {
  it('cabeçalho com tipos detectados e resumo da execução', () => {
    render(<PreviewTable preview={preview} />);
    const table = screen.getByRole('table', { name: 'Resultado do preview' });
    const headers = within(table).getAllByRole('columnheader');
    expect(headers[0]).toHaveTextContent('ADQUIRENTE');
    expect(headers[0]).toHaveTextContent('texto');
    expect(headers[1]).toHaveTextContent('número');
    expect(screen.getByText('2 linhas · 182ms')).toBeInTheDocument();
    expect(screen.getByText('Sugestão: Ranking / barras')).toBeInTheDocument();
  });

  it('valores nulos aparecem como NULL', () => {
    render(<PreviewTable preview={preview} />);
    expect(screen.getByText('NULL')).toBeInTheDocument();
  });

  it('status HTTP quando presente', () => {
    render(<PreviewTable preview={{ ...preview, status: 200 }} />);
    expect(screen.getByText('HTTP 200')).toBeInTheDocument();
  });

  it('sem linhas', () => {
    render(<PreviewTable preview={{ ...preview, rows: [] }} />);
    expect(screen.getByText('A consulta não devolveu linhas')).toBeInTheDocument();
  });
});
