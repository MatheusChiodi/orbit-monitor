import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { formatSql, suggest, tokenizeSql, type SqlCatalog } from './sqlTokens';
import { SqlCodeEditor } from './SqlCodeEditor';

const catalog: SqlCatalog = {
  tables: [
    { name: 'V_RECONCILIATION_PENDING', columns: ['PENDING_QTY', 'LAST_BATCH_AT'] },
    { name: 'V_REFUNDS', columns: ['REFUND_QTY'] },
  ],
};

function Controlled({ initial = '' }: { initial?: string }) {
  const [sql, setSql] = useState(initial);
  return <SqlCodeEditor value={sql} onChange={setSql} catalog={catalog} />;
}

describe('FE-33 SQL editor', () => {
  describe('tokenizeSql (pure)', () => {
    it('classifies keywords, identifiers, strings, numbers and comments', () => {
      const kinds = tokenizeSql("SELECT COUNT(*) AS QTY FROM T WHERE S = 'A' AND N > 10 -- note")
        .filter((t) => t.kind !== 'space')
        .map((t) => `${t.kind}:${t.text}`);
      expect(kinds).toContain('keyword:SELECT');
      expect(kinds).toContain('identifier:QTY');
      expect(kinds).toContain("string:'A'");
      expect(kinds).toContain('number:10');
      expect(kinds).toContain('comment:-- note');
    });
  });

  describe('formatSql (pure)', () => {
    it('upper-cases keywords and breaks main clauses onto new lines', () => {
      expect(formatSql('select count(*) qty from t where a = 1')).toBe('SELECT count(*) qty\nFROM t\nWHERE a = 1');
    });
    it('keeps string literals untouched', () => {
      expect(formatSql("select 'from where' x from t")).toContain("'from where'");
    });
  });

  describe('suggest (pure)', () => {
    it('suggests tables after FROM and columns after a table alias', () => {
      expect(suggest('SELECT * FROM V_RE', catalog).map((s) => s.label)).toEqual(['V_RECONCILIATION_PENDING', 'V_REFUNDS']);
      expect(suggest('SELECT P', catalog).map((s) => s.label)).toContain('PENDING_QTY');
    });
  });

  it('renders highlighted tokens next to a labelled textarea', () => {
    const { container } = render(<Controlled initial="SELECT 1 FROM DUAL" />);
    expect(screen.getByRole('textbox', { name: 'SQL query' })).toHaveValue('SELECT 1 FROM DUAL');
    expect(container.querySelector('[data-token="keyword"]')).toHaveTextContent('SELECT');
    expect(container.querySelector('[data-token="number"]')).toHaveTextContent('1');
  });

  it('Ctrl+Space opens catalog autocomplete; Enter inserts the suggestion', async () => {
    render(<Controlled initial="SELECT * FROM V_RE" />);
    const box = screen.getByRole('textbox', { name: 'SQL query' });
    box.focus();
    await userEvent.keyboard('{Control>} {/Control}');
    const list = screen.getByRole('listbox', { name: 'Suggestions' });
    expect(list).toBeInTheDocument();
    expect(box).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Enter}');
    expect(box).toHaveValue('SELECT * FROM V_RECONCILIATION_PENDING');
  });

  it('Escape closes the suggestions without changing the text', async () => {
    render(<Controlled initial="SELECT * FROM V_RE" />);
    screen.getByRole('textbox', { name: 'SQL query' }).focus();
    await userEvent.keyboard('{Control>} {/Control}{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'SQL query' })).toHaveValue('SELECT * FROM V_RE');
  });

  it('the Format button rewrites the query', async () => {
    render(<Controlled initial="select 1 from dual" />);
    await userEvent.click(screen.getByRole('button', { name: 'Format' }));
    expect(screen.getByRole('textbox', { name: 'SQL query' })).toHaveValue('SELECT 1\nFROM dual');
  });

  it('keeps the guard chips visible and the safe-mode error', () => {
    render(<SqlCodeEditor value="DELETE FROM T" onChange={vi.fn()} catalog={catalog} />);
    expect(screen.getByRole('list', { name: 'Query guards' })).toHaveTextContent('SELECT only');
    expect(screen.getByRole('alert')).toHaveTextContent('SELECT or WITH only');
  });

  it('Tab inserts two spaces instead of leaving the editor', () => {
    const onChange = vi.fn();
    render(<SqlCodeEditor value="SELECT" onChange={onChange} catalog={catalog} />);
    const box = screen.getByRole('textbox', { name: 'SQL query' });
    fireEvent.keyDown(box, { key: 'Tab' });
    expect(onChange).toHaveBeenCalledWith('SELECT  ');
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<SqlCodeEditor value="" onChange={vi.fn()} catalog={catalog} />, 'pt-BR');
    expect(screen.getByRole('button', { name: 'Formatar' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Consulta SQL' })).toBeInTheDocument();
  });
});
