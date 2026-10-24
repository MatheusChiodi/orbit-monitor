import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastViewport, dismissAllToasts } from '@/shared/ui';
import { ConsoleProvider } from '../../ConsoleContext';
import { DEMO_ACCESS, createConsoleSource, type ConsoleApi } from '../../consoleSource';
import { IncidentsScreen } from './IncidentsScreen';

function setup() {
  const source = createConsoleSource({} as ConsoleApi, true);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ConsoleProvider value={{ source, access: DEMO_ACCESS, editable: true, demo: true, navigate: vi.fn() }}>
        <IncidentsScreen />
        <ToastViewport />
      </ConsoleProvider>
    </QueryClientProvider>,
  );
  return source;
}

afterEach(() => dismissAllToasts());

describe('Incidents screen actions', () => {
  it('Resolve asks for confirmation and says it is done', async () => {
    const source = setup();
    const resolve = vi.spyOn(source, 'resolveIncident');
    await userEvent.click(await screen.findByRole('button', { name: 'Resolve Reconciliation queue' }));
    const dialog = screen.getByRole('dialog', { name: 'Resolve Reconciliation queue?' });
    expect(resolve).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Resolve incident' }));
    expect(resolve).toHaveBeenCalledWith('inc-reconciliation');
    expect(await screen.findByText('Incident resolved')).toBeInTheDocument();
  });

  it('acknowledges and reopens with a toast naming the verb', async () => {
    const source = setup();
    const reopen = vi.spyOn(source, 'reopenIncident');
    await userEvent.click(await screen.findByRole('button', { name: 'Acknowledge Reconciliation queue' }));
    expect(await screen.findByText('Incident acknowledged')).toBeInTheDocument();
    const [reopenButton] = await screen.findAllByRole('button', { name: /^Reopen/ });
    await userEvent.click(reopenButton!);
    expect(reopen).toHaveBeenCalled();
    expect(await screen.findByText('Incident reopened')).toBeInTheDocument();
  });
});
