import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { SqlCodeEditor } from './SqlCodeEditor';

const catalog = { tables: [] };

describe('SqlCodeEditor safe mode (ported from SqlEditor)', () => {
  it('shows a visible label and the guards as plain text (not chips)', () => {
    render(<SqlCodeEditor catalog={catalog} value="SELECT 1" onChange={vi.fn()} />);
    expect(screen.getByText('SQL query', { selector: 'label' })).toBeInTheDocument();
    const guards = screen.getByText('SELECT only · stops after 5 s · at most 500 rows · the password stays in the vault');
    expect(guards.tagName).toBe('P');
    expect(screen.getByRole('textbox', { name: 'SQL query' })).toHaveAccessibleDescription(guards.textContent!);
  });

  it('guards and errors in pt-BR', () => {
    renderWithLocale(<SqlCodeEditor catalog={catalog} value="DELETE FROM x" onChange={vi.fn()} />, 'pt-BR');
    expect(screen.getByText(/a senha fica no cofre/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Somente SELECT ou WITH');
    expect(screen.getByRole('textbox', { name: 'Consulta SQL' })).toBeInTheDocument();
  });

  it('forwards edits', () => {
    const onChange = vi.fn();
    render(<SqlCodeEditor catalog={catalog} value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL query' }), { target: { value: 'SELECT 2' } });
    expect(onChange).toHaveBeenCalledWith('SELECT 2');
  });

  it('warns instantly when the statement is not allowed', () => {
    render(<SqlCodeEditor catalog={catalog} value="DELETE FROM x" onChange={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('SELECT or WITH only');
    expect(screen.getByRole('textbox', { name: 'SQL query' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('no error while the editor is empty', () => {
    render(<SqlCodeEditor catalog={catalog} value="" onChange={vi.fn()} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
