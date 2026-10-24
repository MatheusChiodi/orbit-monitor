import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fakeApi, renderSettings, slack } from '../test/fakeApi';
import { renderWithLocale } from '@/test/renderWithLocale';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationsSettings } from './NotificationsSettings';

const down = { id: 'incident.down', title: { en: '{{monitor}} is down', 'pt-BR': '{{monitor}} está fora do ar' }, text: { en: '{{detail}}', 'pt-BR': '{{detail}}' }, custom: true };
const warn = { id: 'incident.warn', title: { en: '{{monitor}} needs attention' }, text: { en: '{{detail}}' }, custom: false };

describe('NotificationsSettings › Messages', () => {
  it('names events plainly and marks customized ones', async () => {
    renderSettings(fakeApi({ listTemplates: { templates: [down, warn], variables: ['monitor'] } }), { tab: 'templates' });
    expect(await screen.findByText('Monitor down')).toBeInTheDocument();
    expect(screen.getByText('Customized')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('previews the saved message', async () => {
    const api = fakeApi({ listTemplates: { templates: [down], variables: [] }, previewTemplate: { title: 'Fila de pagamentos is down', text: 'PENDING_QTY 347 > 200' } });
    renderSettings(api, { tab: 'templates' });
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Monitor down' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Preview' }));
    expect(await screen.findByText('Fila de pagamentos is down')).toBeInTheDocument();
    expect(api.previewTemplate).toHaveBeenCalledWith('incident.down', 'en');
  });

  it('edits only the language that changed on a default message', async () => {
    const api = fakeApi({ listTemplates: { templates: [warn], variables: ['monitor'] } });
    renderSettings(api, { tab: 'templates' });
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Monitor needs attention' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog');
    const subject = within(dialog).getByLabelText('Subject');
    await userEvent.clear(subject);
    await userEvent.type(subject, 'Check {{{{monitor}}');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save message' }));
    expect(api.saveTemplate).toHaveBeenCalledWith('incident.warn', { title: { en: 'Check {{monitor}}' }, text: { en: '{{detail}}' } });
  });

  it('resets a customized message after confirming', async () => {
    const api = fakeApi({ listTemplates: { templates: [down], variables: [] } });
    renderSettings(api, { tab: 'templates' });
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Monitor down' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Reset to default' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reset to default' }));
    expect(api.resetTemplate).toHaveBeenCalledWith('incident.down');
  });
});

describe('NotificationsSettings › Escalation', () => {
  it('adds a policy whose first step notifies a channel', async () => {
    const api = fakeApi({ listChannels: [slack] });
    renderSettings(api, { tab: 'escalation' });
    await userEvent.click(await screen.findByRole('button', { name: 'Add policy' }));
    const dialog = screen.getByRole('dialog', { name: 'Add policy' });
    await userEvent.type(within(dialog).getByLabelText(/^Name/), 'Payments');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save policy' }));
    expect(within(dialog).getByText('Pick a channel for each step.')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Ops chat/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add step' }));
    await userEvent.click(within(dialog).getAllByRole('checkbox', { name: /Ops chat/ })[1]!);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save policy' }));
    expect(api.savePolicy).toHaveBeenCalledWith('payments', {
      name: 'Payments',
      groupIds: [],
      steps: [
        { afterMinutes: 0, channelIds: ['ops'], name: null, onCallScheduleId: null },
        { afterMinutes: 15, channelIds: ['ops'], name: null, onCallScheduleId: null },
      ],
    });
  });

  it('summarizes steps and shows the next escalations', async () => {
    const policy = { id: 'p', name: 'Payments', groupIds: [], steps: [{ afterMinutes: 0, channelIds: ['ops'], name: null, onCallScheduleId: null }, { afterMinutes: 30, channelIds: ['ops'], name: 'Manager', onCallScheduleId: null }] };
    const dueAt = new Date(Date.now() + 8 * 60_000).toISOString();
    renderSettings(
      fakeApi({
        listChannels: [slack],
        listPolicies: [policy],
        upcoming: [{ incidentId: 'inc1', monitorId: 'orders', policyId: 'p', policyName: 'Payments', stepIndex: 1, stepName: 'Manager', dueAt, channelIds: ['ops'], onCall: 'Ana' }],
        listMonitors: [{ id: 'orders', name: 'Orders API' }],
      }),
      { tab: 'escalation' },
    );
    expect(await screen.findByText('2 steps · Right away → 30 min')).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: 'Orders API' });
    expect(link).toHaveAttribute('href', '#/incidents/inc1');
    expect(screen.getByText('in 8 minutes')).toBeInTheDocument();
    expect(screen.getByText(/Notifies Ops chat · on call: Ana/)).toBeInTheDocument();
  });
});

describe('NotificationsSettings › On-call', () => {
  it('adds a rotation', async () => {
    const api = fakeApi();
    renderSettings(api, { tab: 'oncall' });
    await userEvent.click(await screen.findByRole('button', { name: 'Add schedule' }));
    const dialog = screen.getByRole('dialog', { name: 'Add schedule' });
    await userEvent.type(within(dialog).getByLabelText(/^Name/), 'Platform');
    await userEvent.type(within(dialog).getByLabelText(/^People, in order/), 'Ana{enter}Bruno');
    await userEvent.selectOptions(within(dialog).getByLabelText('Shift length'), '168');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save schedule' }));
    expect(api.saveSchedule).toHaveBeenCalledWith('platform', expect.objectContaining({ name: 'Platform', people: ['Ana', 'Bruno'], shiftHours: 168, overrides: [] }));
  });

  it('shows who is on call now', async () => {
    const schedule = { id: 'platform', name: 'Platform', people: ['Ana', 'Bruno'], start: '2026-10-01T09:00:00Z', shiftHours: 24, overrides: null, onCallNow: 'Ana', shiftEndsAt: '2026-10-25T09:00:00Z' };
    renderSettings(fakeApi({ listSchedules: [schedule], onCallNow: [{ scheduleId: 'platform', name: 'Platform', person: 'Ana', shiftEndsAt: '2026-10-25T09:00:00Z' }] }), { tab: 'oncall' });
    expect(await screen.findByRole('heading', { name: 'On call now' })).toBeInTheDocument();
    expect(screen.getByText('2 people · Every day')).toBeInTheDocument();
    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0);
  });
});

describe('NotificationsSettings › pt-BR', () => {
  it('speaks Portuguese', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderWithLocale(
      <QueryClientProvider client={client}>
        <NotificationsSettings api={fakeApi()} editable />
      </QueryClientProvider>,
      'pt-BR',
    );
    expect(await screen.findByText('Nenhum canal ainda')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Plantão' })).toBeInTheDocument();
  });
});
