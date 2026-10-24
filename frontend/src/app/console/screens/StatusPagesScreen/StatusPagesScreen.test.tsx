import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StatusPageRecord } from '@/shared/api/consoleTypes';
import { ToastViewport, dismissAllToasts } from '@/shared/ui';
import { ConsoleProvider } from '../../ConsoleContext';
import { DEMO_ACCESS, createConsoleSource, type ConsoleApi } from '../../consoleSource';
import { StatusPagesScreen } from './StatusPagesScreen';

const page: StatusPageRecord = { id: 'sp-pay', slug: 'payments', title: 'Payments', pub: true, groupIds: ['pay'] };

function setup() {
  const api = {
    getAccess: async () => DEMO_ACCESS,
    listGroups: async () => [{ id: 'pay', name: 'Payments' }, { id: 'core', name: 'Core Banking' }],
    listMonitors: async () => [],
    listStatusPages: vi.fn().mockResolvedValue([page]),
    saveStatusPage: vi.fn(async (item: StatusPageRecord) => item),
    deleteStatusPage: vi.fn().mockResolvedValue(undefined),
  };
  const source = createConsoleSource(api as unknown as ConsoleApi, false);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ConsoleProvider value={{ source, access: DEMO_ACCESS, editable: true, demo: false, navigate: vi.fn() }}>
        <StatusPagesScreen />
        <ToastViewport />
      </ConsoleProvider>
    </QueryClientProvider>,
  );
  return api;
}

afterEach(() => {
  dismissAllToasts();
  window.history.replaceState(null, '', window.location.pathname);
});

describe('Status pages screen', () => {
  it('Edit loads the page and saving keeps its id', async () => {
    const api = setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Payments' }));
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Payments');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Core Banking' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(api.saveStatusPage).toHaveBeenCalledWith(expect.objectContaining({ id: 'sp-pay', slug: 'payments', groupIds: ['pay', 'core'] }));
    expect(await screen.findByText('Status page saved')).toBeInTheDocument();
  });

  it('Delete confirms, deletes and says so', async () => {
    const api = setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Payments' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete Payments?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete status page' }));
    expect(api.deleteStatusPage).toHaveBeenCalledWith('sp-pay');
    expect(await screen.findByText('Status page deleted')).toBeInTheDocument();
  });

  it('Copy puts the full /status address on the clipboard', async () => {
    setup();
    const user = userEvent.setup();
    const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    await user.click(await screen.findByRole('button', { name: 'Copy address of Payments' }));
    expect(write).toHaveBeenCalledWith(`${window.location.origin}/status/payments`);
    expect(await screen.findByText('Address copied')).toBeInTheDocument();
  });

  it('the palette action "new-status-page" focuses the title of a new page', async () => {
    window.history.replaceState(null, '', '#/status-pages?action=new-status-page');
    setup();
    await vi.waitFor(() => expect(screen.getByRole('textbox', { name: 'Title' })).toHaveFocus());
    expect(window.location.hash).toBe('#/status-pages');
  });
});
