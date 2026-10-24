import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SavedQueries, type SavedQueriesSource } from './SavedQueries';

const connections = [{ id: 'pg', name: 'Orders', kind: 'POSTGRES' as const }];
const pending = { id: 'pending', name: 'Pending orders', connectionId: 'pg', sql: 'SELECT COUNT(*) FROM ORDERS' };

function source(list = [pending]): SavedQueriesSource {
  return {
    listSavedQueries: vi.fn().mockResolvedValue(list),
    saveSavedQuery: vi.fn().mockImplementation(async (q) => q),
    deleteSavedQuery: vi.fn().mockResolvedValue(undefined),
  };
}

function renderIt(src: SavedQueriesSource) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SavedQueries source={src} connections={connections} demo={false} />
    </QueryClientProvider>,
  );
}

describe('SavedQueries', () => {
  it('lists every saved query with its connection', async () => {
    const src = source();
    renderIt(src);
    expect(await screen.findByText('Pending orders')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(src.listSavedQueries).toHaveBeenCalledWith('');
  });

  it('adds a query', async () => {
    const src = source([]);
    renderIt(src);
    await userEvent.click(await screen.findByRole('button', { name: 'Add query' }));
    const dialog = screen.getByRole('dialog', { name: 'Add saved query' });
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Late batches');
    await userEvent.type(within(dialog).getByLabelText('SQL'), 'SELECT 1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save query' }));
    expect(src.saveSavedQuery).toHaveBeenCalledWith({ id: 'late-batches', name: 'Late batches', connectionId: 'pg', sql: 'SELECT 1', description: null });
  });

  it('deletes after a confirmation', async () => {
    const src = source();
    renderIt(src);
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Pending orders' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete query' }));
    expect(src.deleteSavedQuery).toHaveBeenCalledWith('pending');
  });
});
