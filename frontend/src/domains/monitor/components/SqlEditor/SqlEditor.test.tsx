import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { SqlEditor } from './SqlEditor';

describe('SqlEditor', () => {
  it('shows the visible guards', () => {
    render(<SqlEditor value="SELECT 1" onChange={vi.fn()} />);
    for (const guard of ['SELECT only', 'Timeout 5s', 'Max. 500 rows', 'Credential in vault']) {
      expect(screen.getByText(guard)).toBeInTheDocument();
    }
  });

  it('guards and errors in pt-BR', () => {
    renderWithLocale(<SqlEditor value="DELETE FROM x" onChange={vi.fn()} />, 'pt-BR');
    expect(screen.getByText('Credencial no cofre')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Somente SELECT ou WITH');
    expect(screen.getByRole('textbox', { name: 'Consulta SQL' })).toBeInTheDocument();
  });

  it('forwards edits', () => {
    const onChange = vi.fn();
    render(<SqlEditor value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'SQL query' }), { target: { value: 'SELECT 2' } });
    expect(onChange).toHaveBeenCalledWith('SELECT 2');
  });

  it('warns instantly when the statement is not allowed', () => {
    render(<SqlEditor value="DELETE FROM x" onChange={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('SELECT or WITH only');
    expect(screen.getByRole('textbox', { name: 'SQL query' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('no error while the editor is empty', () => {
    render(<SqlEditor value="" onChange={vi.fn()} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
