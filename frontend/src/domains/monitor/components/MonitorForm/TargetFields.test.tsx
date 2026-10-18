import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { initialFormState } from '../../form';
import { TargetFields } from './TargetFields';

const connections = [{ id: 'pg', name: 'BI Postgres', kind: 'POSTGRES' as const }];

describe('TargetFields', () => {
  it('SQL: connection and editor', () => {
    render(<TargetFields state={initialFormState()} connections={connections} onChange={vi.fn()} />);
    expect(screen.getByRole('option', { name: 'BI Postgres · POSTGRES' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'SQL query' })).toBeInTheDocument();
  });

  it('HTTP GET has no body; POST does', () => {
    const state = { ...initialFormState(), type: 'HTTP' as const };
    const { rerender } = render(<TargetFields state={state} connections={[]} onChange={vi.fn()} />);
    expect(screen.queryByLabelText('Body')).toBeNull();
    rerender(<TargetFields state={{ ...state, method: 'POST' }} connections={[]} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Body')).toBeInTheDocument();
  });

  it('forwards URL and header changes', () => {
    const onChange = vi.fn();
    render(<TargetFields state={{ ...initialFormState(), type: 'HTTP' }} connections={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://a' } });
    expect(onChange).toHaveBeenLastCalledWith({ url: 'https://a' });
    fireEvent.change(screen.getByLabelText('Headers (one per line, Name: value)'), { target: { value: 'A: 1' } });
    expect(onChange).toHaveBeenLastCalledWith({ headersText: 'A: 1' });
  });

  it('labels in pt-BR', () => {
    renderWithLocale(<TargetFields state={{ ...initialFormState(), type: 'HTTP' }} connections={[]} onChange={vi.fn()} />, 'pt-BR');
    expect(screen.getByLabelText('Método')).toBeInTheDocument();
    expect(screen.getByLabelText('Headers (um por linha, Nome: valor)')).toBeInTheDocument();
  });
});
