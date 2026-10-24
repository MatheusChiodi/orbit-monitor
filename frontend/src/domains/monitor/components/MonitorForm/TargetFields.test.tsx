import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { initialFormState } from '../../form';
import { TargetFields } from './TargetFields';

const connections = [{ id: 'pg', name: 'BI Postgres', kind: 'POSTGRES' as const }];

describe('TargetFields', () => {
  it('SQL: connection and editor', () => {
    render(<TargetFields state={initialFormState()} connections={connections} onChange={vi.fn()} />);
    expect(screen.getByRole('option', { name: 'BI Postgres · PostgreSQL' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'SQL query' })).toBeInTheDocument();
  });

  it('SQL without connections invites to add one from the form', async () => {
    const onAdd = vi.fn();
    render(<TargetFields state={initialFormState()} connections={[]} onChange={vi.fn()} onAddConnection={onAdd} />);
    expect(screen.getByRole('option', { name: 'No connections yet' })).toBeInTheDocument();
    expect(screen.getByText('Add the database Orbit should read from.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add connection' }));
    expect(onAdd).toHaveBeenCalled();
  });

  it('SQL shows the test result of the chosen connection', () => {
    const state = { ...initialFormState(), connectionId: 'pg' };
    render(<TargetFields state={state} connections={connections} onChange={vi.fn()} connectionTest={{ phase: 'done', result: { ok: false, ms: 10, error: 'timed out' } }} />);
    expect(screen.getByText("Couldn't connect. timed out")).toBeInTheDocument();
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
