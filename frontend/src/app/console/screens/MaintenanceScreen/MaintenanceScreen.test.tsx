import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastViewport, dismissAllToasts } from '@/shared/ui';
import { ConsoleProvider } from '../../ConsoleContext';
import { DEMO_ACCESS, createConsoleSource, type ConsoleApi } from '../../consoleSource';
import { MaintenanceScreen } from './MaintenanceScreen';

function setup() {
  const source = createConsoleSource({} as ConsoleApi, true);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ConsoleProvider value={{ source, access: DEMO_ACCESS, editable: true, demo: true, navigate: vi.fn() }}>
        <MaintenanceScreen />
        <ToastViewport />
      </ConsoleProvider>
    </QueryClientProvider>,
  );
  return source;
}

afterEach(() => dismissAllToasts());

describe('Maintenance screen', () => {
  it('?action=new-window (command palette) opens the New window form once', async () => {
    window.location.hash = '#/maintenance?action=new-window';
    setup();
    expect(await screen.findByRole('dialog', { name: 'New maintenance window' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/maintenance');
  });

  it('creates, edits and deletes a window with a toast for each', async () => {
    const source = setup();
    const remove = vi.spyOn(source, 'deleteMaintenance');
    await userEvent.click(await screen.findByRole('button', { name: 'New window' }));
    await userEvent.type(screen.getByRole('textbox', { name: /Name/ }), 'Kernel update');
    await userEvent.click(screen.getByRole('button', { name: 'Create window' }));
    expect(await screen.findByText('Maintenance window created')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /^Edit Kernel update/ }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete window' }));
    expect(remove).toHaveBeenCalled();
    expect(await screen.findByText('Maintenance window deleted')).toBeInTheDocument();
  });
});
