import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Connection } from '@/shared/api/types';
import type { ConnectionsSource } from '../model';
import ConnectionsSettings from './index';

const pg: Connection = { id: 'pg', name: 'Orders', kind: 'POSTGRES', jdbcUrl: 'jdbc:postgresql://db/orders', username: 'orbit', password: '•••• (vault)' };

function source(list: Connection[] = [pg]): ConnectionsSource {
  return {
    listConnections: vi.fn().mockResolvedValue(list),
    saveConnection: vi.fn().mockImplementation(async (id: string, input: { name: string }) => ({ ...pg, id, name: input.name })),
    deleteConnection: vi.fn().mockResolvedValue(undefined),
    testConnection: vi.fn().mockResolvedValue({ ok: false, ms: 10_000, error: 'Connection failed: timed out' }),
  };
}

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('ConnectionsSettings', () => {
  it('invites to add the first connection', async () => {
    renderWithQuery(<ConnectionsSettings source={source([])} demo={false} />);
    expect(await screen.findByText('No connections yet')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Add connection' })[0]!);
    expect(screen.getByRole('dialog', { name: 'Add connection' })).toBeInTheDocument();
  });

  it('lists connections without ever showing the password', async () => {
    renderWithQuery(<ConnectionsSettings source={source()} demo={false} />);
    expect(await screen.findByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('jdbc:postgresql://db/orders')).toBeInTheDocument();
    expect(screen.getByText('Not tested')).toBeInTheDocument();
    expect(screen.queryByText(/s3cret/)).toBeNull();
  });

  it('tests a connection and explains a failure', async () => {
    const api = source();
    renderWithQuery(<ConnectionsSettings source={api} demo={false} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Orders' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Test connection' }));
    expect(api.testConnection).toHaveBeenCalledWith('pg');
    expect(await screen.findByText("Couldn't connect. Connection failed: timed out")).toBeInTheDocument();
  });

  it('asks before deleting', async () => {
    const api = source();
    renderWithQuery(<ConnectionsSettings source={api} demo={false} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Orders' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete Orders?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete connection' }));
    expect(api.deleteConnection).toHaveBeenCalledWith('pg', false);
  });

  it('is read-only away from the Orbit machine', async () => {
    renderWithQuery(<ConnectionsSettings source={source()} demo={false} editable={false} />);
    expect(await screen.findByText('Orders')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add connection' })).toBeNull();
    expect(screen.getByText('Connections can only be changed on the machine that runs Orbit.')).toBeInTheDocument();
  });

  it('opens "Add connection" from the command palette address', async () => {
    window.location.hash = '#/settings/connections?action=add-connection';
    renderWithQuery(<ConnectionsSettings source={source()} demo={false} />);
    expect(await screen.findByRole('dialog', { name: 'Add connection' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/settings/connections');
    window.location.hash = '';
  });

  it('says how many monitors use a connection and pauses them when it is deleted', async () => {
    const api = source([{ ...pg, usedBy: 2 }]);
    renderWithQuery(<ConnectionsSettings source={api} demo={false} />);
    expect(await screen.findByText('2 monitors')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Orders' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete Orders?' });
    expect(within(dialog).getByText(/2 SQL monitors use it/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete connection' }));
    expect(api.deleteConnection).toHaveBeenCalledWith('pg', true);
  });
});
