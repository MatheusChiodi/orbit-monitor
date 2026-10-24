import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fakeApi, renderSettings, slack } from '../test/fakeApi';

describe('NotificationsSettings › Channels', () => {
  it('invites to add the first channel', async () => {
    renderSettings(fakeApi());
    expect(await screen.findByText('No channels yet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add channel' }));
    expect(screen.getByRole('dialog', { name: 'Add channel' })).toBeInTheDocument();
  });

  it('adds a Slack channel and explains what is missing first', async () => {
    const api = fakeApi();
    renderSettings(api);
    await userEvent.click(await screen.findByRole('button', { name: 'Add channel' }));
    const dialog = screen.getByRole('dialog', { name: 'Add channel' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save channel' }));
    expect(within(dialog).getByText('Give the channel a name.')).toBeInTheDocument();
    expect(within(dialog).getByText('Paste the URL Orbit should send to.')).toBeInTheDocument();
    expect(api.saveChannel).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText(/^Name/), 'Ops team');
    await userEvent.type(within(dialog).getByLabelText('Webhook URL'), 'https://hooks.slack.com/services/T/B/x');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save channel' }));
    expect(api.saveChannel).toHaveBeenCalledWith(
      'ops-team',
      expect.objectContaining({ name: 'Ops team', type: 'SLACK', url: 'https://hooks.slack.com/services/T/B/x', groupIds: [], enabled: true }),
    );
  });

  it('shows the fields of each kind (e-mail needs a mail server)', async () => {
    renderSettings(fakeApi());
    await userEvent.click(await screen.findByRole('button', { name: 'Add channel' }));
    const dialog = screen.getByRole('dialog', { name: 'Add channel' });
    await userEvent.selectOptions(within(dialog).getByLabelText('Kind'), 'EMAIL');
    expect(within(dialog).queryByLabelText('Webhook URL')).toBeNull();
    expect(within(dialog).getByLabelText(/^SMTP server/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Password (optional)')).toHaveAttribute('type', 'password');
  });

  it('lists channels without ever showing secrets or full recipients', async () => {
    renderSettings(fakeApi({ listChannels: [slack, { ...slack, id: 'mail', name: 'On-call mail', type: 'EMAIL', recipients: ['o•••@e•••.com'], enabled: false }] }));
    expect(await screen.findByText('Ops chat')).toBeInTheDocument();
    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.queryByText(/vault/)).toBeNull();
    expect(screen.queryByText(/@/)).toBeNull();
  });

  it('keeps stored secrets on edit unless a new one is typed', async () => {
    const api = fakeApi({ listChannels: [slack] });
    renderSettings(api);
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Ops chat' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit channel' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit channel' });
    expect(within(dialog).getByLabelText('Webhook URL')).toHaveValue('');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save channel' }));
    expect(api.saveChannel).toHaveBeenCalledWith('ops', expect.objectContaining({ url: undefined }));
  });

  it('sends a test and explains a failure', async () => {
    const api = fakeApi({ listChannels: [slack], testChannel: { delivered: false, error: 'HTTP 404 from hooks.slack.com' } });
    renderSettings(api);
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Ops chat' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Send test' }));
    expect(api.testChannel).toHaveBeenCalledWith('ops');
    expect(await screen.findByText('Not delivered. The service answered HTTP 404. Check the address and token.')).toBeInTheDocument();
  });

  it('asks before deleting', async () => {
    const api = fakeApi({ listChannels: [slack] });
    renderSettings(api);
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Ops chat' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete Ops chat?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete channel' }));
    expect(api.deleteChannel).toHaveBeenCalledWith('ops');
  });

  it('opens the add dialog when the command palette asks for it', async () => {
    window.location.hash = '#/settings/notifications?action=add-channel';
    renderSettings(fakeApi(), { tab: 'oncall' });
    expect(await screen.findByRole('dialog', { name: 'Add channel' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Channels' })).toHaveAttribute('aria-selected', 'true');
    expect(window.location.hash).toBe('#/settings/notifications');
  });

  it('is read-only away from the Orbit machine', async () => {
    renderSettings(fakeApi({ listChannels: [slack] }), { editable: false });
    expect(await screen.findByText('Ops chat')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add channel' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Actions for Ops chat' })).toBeNull();
    expect(screen.getByText('Notifications can only be changed on the machine that runs Orbit.')).toBeInTheDocument();
  });

  it('lists delivery failures by channel name', async () => {
    renderSettings(fakeApi({ listChannels: [slack], deadLetters: [{ channelId: 'ops', error: 'HTTP 410 Gone', attempts: 3 }, { channelId: 'gone', error: 'timeout', attempts: 1 }] }), {
      tab: 'failures',
    });
    expect(await screen.findByText('The service answered HTTP 410. Check the address and token.')).toBeInTheDocument();
    expect(screen.getByText('Details: HTTP 410 Gone')).toBeInTheDocument();
    expect(await screen.findByText('Ops chat')).toBeInTheDocument();
    expect(screen.getByText('3 attempts')).toBeInTheDocument();
    expect(screen.getByText('Deleted channel (gone)')).toBeInTheDocument();
  });

  it('says when every message was delivered', async () => {
    renderSettings(fakeApi(), { tab: 'failures' });
    expect(await screen.findByText('Every message was delivered')).toBeInTheDocument();
  });
});
