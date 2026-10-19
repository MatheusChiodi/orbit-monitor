import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { diffLines } from './diffLines';
import { QueryDiff } from './QueryDiff';

const before = 'SELECT COUNT(*) AS PENDING_QTY\nFROM V_RECONCILIATION_PENDING\nWHERE STATUS = \'P\'';
const after = 'SELECT COUNT(*) AS PENDING_QTY\nFROM V_RECONCILIATION_PENDING\nWHERE STATUS IN (\'P\', \'R\')';
const change = { before, after, operator: 'M. Chiodi', client: 'loopback' as const, at: '2026-10-18T17:04:00.000Z' };

describe('FE-36 query history diff', () => {
  describe('diffLines (pure)', () => {
    it('marks equal, removed and added lines', () => {
      expect(diffLines(before, after)).toEqual([
        { op: 'equal', left: 1, right: 1, text: 'SELECT COUNT(*) AS PENDING_QTY' },
        { op: 'equal', left: 2, right: 2, text: 'FROM V_RECONCILIATION_PENDING' },
        { op: 'remove', left: 3, right: null, text: "WHERE STATUS = 'P'" },
        { op: 'add', left: null, right: 3, text: "WHERE STATUS IN ('P', 'R')" },
      ]);
    });

    it('identical queries produce no changes', () => {
      expect(diffLines(before, before).every((l) => l.op === 'equal')).toBe(true);
    });
  });

  it('shows the diff side by side with who and when (self-declared operator)', () => {
    render(<QueryDiff changes={[change]} />);
    const table = screen.getByRole('table', { name: 'SELECT changes' });
    expect(table).toBeInTheDocument();
    expect(screen.getByText('M. Chiodi (self-declared) · loopback')).toBeInTheDocument();
    expect(screen.getAllByRole('deletion')[0]).toHaveTextContent("WHERE STATUS = 'P'");
    expect(screen.getAllByRole('insertion')[0]).toHaveTextContent("WHERE STATUS IN ('P', 'R')");
  });

  it('changes are announced in text, not only by color', () => {
    render(<QueryDiff changes={[change]} />);
    expect(screen.getByText('1 line removed, 1 line added')).toBeInTheDocument();
  });

  it('a card number written as a literal in the SELECT is masked', () => {
    const leak = { ...change, after: "SELECT * FROM T WHERE PAN = '4111 1111 1111 1111'" };
    render(<QueryDiff changes={[leak]} />);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/4111\s?1111\s?1111\s?1111/);
    expect(text).toContain('•••• •••• •••• 1111');
  });

  it('never shows query results, only the SELECT text', () => {
    render(<QueryDiff changes={[change]} />);
    expect(screen.queryByRole('table', { name: 'Preview result' })).toBeNull();
  });

  it('empty history', () => {
    render(<QueryDiff changes={[]} />);
    expect(screen.getByText('No changes to this SELECT in the audit trail yet')).toBeInTheDocument();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<QueryDiff changes={[change]} />, 'pt-BR');
    expect(screen.getByRole('table', { name: 'Alterações do SELECT' })).toBeInTheDocument();
    expect(screen.getByText('1 linha removida, 1 linha adicionada')).toBeInTheDocument();
  });
});
