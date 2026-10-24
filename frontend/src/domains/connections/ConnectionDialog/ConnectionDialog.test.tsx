import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConnectionDialog } from './ConnectionDialog';

const stored = { id: 'pg', name: 'Orders', kind: 'POSTGRES' as const, jdbcUrl: 'jdbc:postgresql://h/db', username: 'orbit', password: '•••• (vault)' };

describe('ConnectionDialog', () => {
  it('saves a new connection with a readable id and the typed password', async () => {
    const onSave = vi.fn().mockImplementation(async (id: string) => ({ ...stored, id }));
    const onSaved = vi.fn();
    render(<ConnectionDialog open onClose={vi.fn()} takenIds={[]} onSave={onSave} onSaved={onSaved} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Orders DB');
    await userEvent.type(screen.getByLabelText('JDBC URL'), 'jdbc:postgresql://db/orders');
    await userEvent.type(screen.getByLabelText('User'), 'orbit');
    await userEvent.type(screen.getByLabelText('Password'), 's3cret');
    await userEvent.click(screen.getByRole('button', { name: 'Save connection' }));
    expect(onSave).toHaveBeenCalledWith('orders-db', { name: 'Orders DB', jdbcUrl: 'jdbc:postgresql://db/orders', username: 'orbit', password: 's3cret' });
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'orders-db' }));
  });

  it('says what is missing instead of saving', async () => {
    const onSave = vi.fn();
    render(<ConnectionDialog open onClose={vi.fn()} takenIds={[]} onSave={onSave} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save connection' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a JDBC URL that starts with jdbc:')).toBeInTheDocument();
    expect(screen.getByText('Enter the password or the name of an environment variable')).toBeInTheDocument();
  });

  it('keeps the stored password on edit and never shows it', async () => {
    const onSave = vi.fn().mockResolvedValue(stored);
    render(<ConnectionDialog open connection={stored} onClose={vi.fn()} takenIds={['pg']} onSave={onSave} onSaved={vi.fn()} />);
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(screen.queryByDisplayValue('•••• (vault)')).toBeNull();
    expect(screen.getByText('A password is stored. Leave empty to keep it.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save connection' }));
    expect(onSave).toHaveBeenCalledWith('pg', { name: 'Orders', jdbcUrl: 'jdbc:postgresql://h/db', username: 'orbit' });
  });

  it('shows the server error and stays open', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('jdbcUrl is invalid'));
    const onSaved = vi.fn();
    render(<ConnectionDialog open connection={stored} onClose={vi.fn()} takenIds={['pg']} onSave={onSave} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save connection' }));
    expect(await screen.findByText("Couldn't save the connection. jdbcUrl is invalid")).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
