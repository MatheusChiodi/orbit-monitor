import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastViewport, dismissAllToasts } from '@/shared/ui';
import { ActiveSilence, SilenceDialog, type SilenceApi } from './SilenceDialog';

function api(overrides: Partial<SilenceApi> = {}): SilenceApi {
  return {
    listSilences: vi.fn().mockResolvedValue([]),
    createSilence: vi.fn(async ({ target, reason, minutes }) => ({
      id: 'sil_1',
      target,
      reason,
      createdBy: 'loopback',
      createdAt: '2026-10-24T10:00:00Z',
      until: new Date(Date.now() + minutes * 60_000).toISOString(),
    })),
    liftSilence: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function wrap(ui: React.ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {ui}
      <ToastViewport />
    </QueryClientProvider>,
  );
}

afterEach(() => dismissAllToasts());

describe('SilenceDialog', () => {
  it('asks for a reason, then silences the target for the chosen duration', async () => {
    const source = api();
    const onSilenced = vi.fn();
    wrap(<SilenceDialog open onClose={vi.fn()} target="shop" targetName="Shop" source={source} onSilenced={onSilenced} />);
    const dialog = screen.getByRole('dialog', { name: 'Silence alerts for Shop' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Silence alerts' }));
    expect(within(dialog).getByText('Say why the alerts are silenced.')).toBeInTheDocument();
    expect(source.createSilence).not.toHaveBeenCalled();
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Reason/ }), 'Deploy');
    await userEvent.click(within(dialog).getByRole('radio', { name: '4 h' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Silence alerts' }));
    expect(source.createSilence).toHaveBeenCalledWith({ target: 'shop', reason: 'Deploy', minutes: 240 });
    expect(await screen.findByText(/^Alerts silenced until \d{2}:\d{2}$/)).toBeInTheDocument();
    expect(onSilenced).toHaveBeenCalled();
  });

  it('custom minutes stay between 1 and 10080', async () => {
    const source = api();
    wrap(<SilenceDialog open onClose={vi.fn()} target="shop" targetName="Shop" source={source} />);
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Reason/ }), 'Long job');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Custom' }));
    const minutes = within(dialog).getByRole('spinbutton', { name: 'Minutes' });
    await userEvent.clear(minutes);
    await userEvent.type(minutes, '20000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Silence alerts' }));
    expect(within(dialog).getByText('Choose between 1 and 10080 minutes.')).toBeInTheDocument();
    await userEvent.clear(minutes);
    await userEvent.type(minutes, '90');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Silence alerts' }));
    expect(source.createSilence).toHaveBeenCalledWith({ target: 'shop', reason: 'Long job', minutes: 90 });
  });
});

describe('ActiveSilence', () => {
  it('shows the active silence of the target and lifts it', async () => {
    const until = new Date(Date.now() + 3_600_000).toISOString();
    const source = api({
      listSilences: vi.fn().mockResolvedValue([
        { id: 'sil_9', target: 'shop', reason: 'Deploy', createdBy: 'loopback', createdAt: until, until },
        { id: 'sil_8', target: 'other', reason: 'x', createdBy: 'loopback', createdAt: until, until },
      ]),
    });
    wrap(<ActiveSilence target="shop" source={source} editable />);
    expect(await screen.findByText(/Alerts silenced until \d{2}:\d{2}: Deploy/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lift silence' }));
    expect(source.liftSilence).toHaveBeenCalledWith('sil_9');
    expect(await screen.findByText('Silence lifted')).toBeInTheDocument();
  });

  it('renders nothing without an active silence', async () => {
    const source = api();
    const { container } = wrap(<ActiveSilence target="shop" source={source} editable />);
    await vi.waitFor(() => expect(source.listSilences).toHaveBeenCalled());
    expect(container.querySelector('[data-silence]')).toBeNull();
  });
});
