import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastViewport, dismissAllToasts } from '@/shared/ui';
import { ConsoleProvider } from '../../ConsoleContext';
import { DEMO_ACCESS, createConsoleSource, type ConsoleApi } from '../../consoleSource';
import { IncidentScreen } from './IncidentScreen';

function setup(id = 'inc-reconciliation') {
  const source = createConsoleSource({} as ConsoleApi, true);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ConsoleProvider value={{ source, access: DEMO_ACCESS, editable: true, demo: true, navigate: vi.fn() }}>
        <IncidentScreen id={id} />
        <ToastViewport />
      </ConsoleProvider>
    </QueryClientProvider>,
  );
  return source;
}

afterEach(() => dismissAllToasts());

describe('Incident detail actions', () => {
  it('Resolve confirms, then the postmortem can be copied as Markdown', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Resolve' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Resolve incident' }));
    expect(await screen.findByText('Incident resolved')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Copy as Markdown' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^# Postmortem: Reconciliation queue/));
    expect(await screen.findByText('Postmortem copied')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeInTheDocument();
  });

  it('silences the monitor alerts and shows the active silence with Lift silence', async () => {
    const source = setup();
    const create = vi.spyOn(source, 'createSilence');
    await userEvent.click(await screen.findByRole('button', { name: 'Silence alerts…' }));
    const dialog = screen.getByRole('dialog', { name: 'Silence alerts for Reconciliation queue' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Reason/ }), 'Batch rerun');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Silence alerts' }));
    expect(create).toHaveBeenCalledWith({ target: 'reconciliation', reason: 'Batch rerun', minutes: 60 });
    expect(await screen.findByRole('button', { name: 'Lift silence' })).toBeInTheDocument();
  });
});
