import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { initialFormState } from '../../form';
import { TargetFields } from './TargetFields';

const connections = [{ id: 'pg', name: 'Postgres BI', kind: 'POSTGRES' as const }];

describe('TargetFields', () => {
  it('SQL: conexão e editor', () => {
    render(<TargetFields state={initialFormState()} connections={connections} onChange={vi.fn()} />);
    expect(screen.getByRole('option', { name: 'Postgres BI · POSTGRES' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Consulta SQL' })).toBeInTheDocument();
  });

  it('HTTP GET não mostra body; POST mostra', () => {
    const state = { ...initialFormState(), type: 'HTTP' as const };
    const { rerender } = render(<TargetFields state={state} connections={[]} onChange={vi.fn()} />);
    expect(screen.queryByLabelText('Body')).toBeNull();
    rerender(<TargetFields state={{ ...state, method: 'POST' }} connections={[]} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Body')).toBeInTheDocument();
  });

  it('repassa mudanças de URL e headers', () => {
    const onChange = vi.fn();
    render(<TargetFields state={{ ...initialFormState(), type: 'HTTP' }} connections={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://a' } });
    expect(onChange).toHaveBeenLastCalledWith({ url: 'https://a' });
    fireEvent.change(screen.getByLabelText('Headers (um por linha, Nome: valor)'), { target: { value: 'A: 1' } });
    expect(onChange).toHaveBeenLastCalledWith({ headersText: 'A: 1' });
  });
});
