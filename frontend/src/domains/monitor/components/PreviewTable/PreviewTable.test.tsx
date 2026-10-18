import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { PreviewTable } from './PreviewTable';

const preview = {
  columns: [
    { name: 'ACQUIRER', type: 'text' as const },
    { name: 'ERROR_QTY', type: 'number' as const },
  ],
  rows: [
    { ACQUIRER: 'Cielo', ERROR_QTY: 12 },
    { ACQUIRER: 'Rede', ERROR_QTY: null },
  ],
  elapsedMs: 182,
};

describe('PreviewTable', () => {
  it('header with detected types and the execution summary', () => {
    render(<PreviewTable preview={preview} />);
    const table = screen.getByRole('table', { name: 'Preview result' });
    const headers = within(table).getAllByRole('columnheader');
    expect(headers[0]).toHaveTextContent('ACQUIRER');
    expect(headers[0]).toHaveTextContent('text');
    expect(headers[1]).toHaveTextContent('number');
    expect(screen.getByText('2 rows · 182ms')).toBeInTheDocument();
    expect(screen.getByText('Suggestion: Ranking / bars')).toBeInTheDocument();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<PreviewTable preview={preview} />, 'pt-BR');
    const table = screen.getByRole('table', { name: 'Resultado do preview' });
    expect(within(table).getAllByRole('columnheader')[1]).toHaveTextContent('número');
    expect(screen.getByText('2 linhas · 182ms')).toBeInTheDocument();
    expect(screen.getByText('Sugestão: Ranking / barras')).toBeInTheDocument();
  });

  it('null values show as NULL', () => {
    render(<PreviewTable preview={preview} />);
    expect(screen.getByText('NULL')).toBeInTheDocument();
  });

  it('HTTP status when present', () => {
    render(<PreviewTable preview={{ ...preview, status: 200 }} />);
    expect(screen.getByText('HTTP 200')).toBeInTheDocument();
  });

  it('no rows', () => {
    render(<PreviewTable preview={{ ...preview, rows: [] }} />);
    expect(screen.getByText('The query returned no rows')).toBeInTheDocument();
  });
});
