import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { initialFormState, type MonitorFormState } from '../../form';
import { TargetFields } from './TargetFields';

const state = (patch: Partial<MonitorFormState>): MonitorFormState => ({ ...initialFormState(), ...patch });

describe('TargetFields for the new monitor kinds', () => {
  it('FE-33: SQL uses the code editor with catalog suggestions (Ctrl+Space after FROM)', async () => {
    const onChange = vi.fn();
    render(
      <TargetFields
        state={state({ type: 'SQL', connectionId: 'pg', sql: 'SELECT * FROM ' })}
        connections={[]}
        catalog={{ tables: [{ name: 'ORDERS', columns: ['ID'] }] }}
        onChange={onChange}
      />,
    );
    const editor = screen.getByRole('textbox', { name: 'SQL query' });
    editor.focus();
    await userEvent.keyboard('{Control>} {/Control}');
    expect(within(screen.getByRole('listbox', { name: 'Suggestions' })).getByRole('option', { name: 'ORDERS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Format' })).toBeInTheDocument();
  });

  it('says when the catalog cannot be loaded', () => {
    render(<TargetFields state={state({ type: 'SQL', connectionId: 'pg' })} connections={[]} catalogStatus="unavailable" onChange={vi.fn()} />);
    expect(screen.getByText('Table suggestions are unavailable for this connection.')).toBeInTheDocument();
  });

  it('TCP: host and port (digits only)', () => {
    const onChange = vi.fn();
    render(<TargetFields state={state({ type: 'TCP' })} connections={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Host'), { target: { value: 'db.internal' } });
    expect(onChange).toHaveBeenLastCalledWith({ host: 'db.internal' });
    fireEvent.change(screen.getByLabelText('Port'), { target: { value: '54a32' } });
    expect(onChange).toHaveBeenLastCalledWith({ port: '5432' });
  });

  it('DNS: record type and expected answer; gRPC: service and TLS; Kafka: servers and group', () => {
    const { rerender } = render(<TargetFields state={state({ type: 'DNS' })} connections={[]} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Record type')).toHaveValue('A');
    expect(screen.getByLabelText('Expected answer (optional)')).toBeInTheDocument();
    rerender(<TargetFields state={state({ type: 'GRPC' })} connections={[]} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Health service (optional)')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Use TLS' })).not.toBeChecked();
    rerender(<TargetFields state={state({ type: 'KAFKA' })} connections={[]} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Bootstrap servers')).toBeInTheDocument();
    expect(screen.getByLabelText('Consumer group')).toBeInTheDocument();
  });

  it('PUSH explains the secret URL and asks only for the max silence', () => {
    render(<TargetFields state={state({ type: 'PUSH' })} connections={[]} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Max. silence (s)')).toHaveValue(3600);
    expect(screen.queryByLabelText('Host')).toBeNull();
    expect(screen.getByText(/secret push URL/)).toBeInTheDocument();
  });

  it('HTTP: OAuth2 client credentials with a write-only secret field', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<TargetFields state={state({ type: 'HTTP' })} connections={[]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'OAuth2 client credentials' }));
    expect(onChange).toHaveBeenLastCalledWith({ auth: 'oauth2' });
    rerender(<TargetFields state={state({ type: 'HTTP', auth: 'oauth2' })} connections={[]} onChange={onChange} />);
    const secret = screen.getByLabelText('Client secret');
    expect(secret).toHaveAttribute('type', 'password');
    expect(secret).toHaveAttribute('autocomplete', 'off');
    fireEvent.change(secret, { target: { value: 'hunter2' } });
    expect(onChange).toHaveBeenLastCalledWith({ clientSecret: 'hunter2' });
    expect(secret).not.toHaveAttribute('value');
  });

  it('HTTP steps: add and remove steps', async () => {
    const onChange = vi.fn();
    render(<TargetFields state={state({ type: 'HTTP_STEPS' })} connections={[]} onChange={onChange} />);
    expect(within(screen.getByRole('list', { name: 'Steps' })).getAllByRole('listitem')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Add step' }));
    expect(onChange.mock.calls.at(-1)![0].steps).toHaveLength(2);
  });
});
