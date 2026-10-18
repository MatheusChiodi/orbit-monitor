import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SqlEditor } from './SqlEditor';

describe('SqlEditor', () => {
  it('mostra os guardas visíveis', () => {
    render(<SqlEditor value="SELECT 1" onChange={vi.fn()} />);
    for (const guard of ['Somente SELECT', 'Timeout 5s', 'Máx. 500 linhas', 'Credencial no cofre']) {
      expect(screen.getByText(guard)).toBeInTheDocument();
    }
  });

  it('repassa a edição', () => {
    const onChange = vi.fn();
    render(<SqlEditor value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Consulta SQL' }), { target: { value: 'SELECT 2' } });
    expect(onChange).toHaveBeenCalledWith('SELECT 2');
  });

  it('avisa na hora quando o comando não é permitido', () => {
    render(<SqlEditor value="DELETE FROM x" onChange={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Somente SELECT ou WITH');
    expect(screen.getByRole('textbox', { name: 'Consulta SQL' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('não acusa erro com o editor vazio', () => {
    render(<SqlEditor value="" onChange={vi.fn()} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
