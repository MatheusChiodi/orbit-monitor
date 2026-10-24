import { describe, expect, it, vi } from 'vitest';
import { createNotificationsApi, minutesOf } from './notificationsApi';

function fakeFetch(body: unknown, status = 200) {
  return vi.fn(async () =>
    status === 204 ? new Response(null, { status }) : new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

function call(fetch: ReturnType<typeof fakeFetch>, index = 0) {
  const [url, init] = fetch.mock.calls[index] as unknown as [string, RequestInit];
  return { url, method: init.method, body: init.body ? (JSON.parse(String(init.body)) as unknown) : undefined };
}

describe('notificationsApi', () => {
  it('saves a channel with PUT and an encoded id', async () => {
    const fetch = fakeFetch({ id: 'ops chat', name: 'Ops', type: 'SLACK' });
    const api = createNotificationsApi({ fetch });
    await api.saveChannel('ops chat', { name: 'Ops', type: 'SLACK', url: 'https://hooks.example/x', enabled: true });
    expect(call(fetch)).toMatchObject({ url: '/api/channels/ops%20chat', method: 'PUT', body: { name: 'Ops', type: 'SLACK' } });
  });

  it('sends a test message and returns the delivery result', async () => {
    const fetch = fakeFetch({ delivered: false, error: 'HTTP 404' });
    const result = await createNotificationsApi({ fetch }).testChannel('ops');
    expect(call(fetch)).toMatchObject({ url: '/api/channels/ops/test', method: 'POST' });
    expect(result).toEqual({ delivered: false, error: 'HTTP 404' });
  });

  it('reads dead letters, templates, upcoming escalations and who is on call', async () => {
    const fetch = fakeFetch([]);
    const api = createNotificationsApi({ fetch });
    await api.deadLetters();
    await api.listTemplates();
    await api.upcoming();
    await api.onCallNow();
    expect(fetch.mock.calls.map((c) => (c as unknown as [string])[0])).toEqual([
      '/api/channels/dead-letters',
      '/api/notification-templates',
      '/api/escalation/upcoming',
      '/api/oncall/now',
    ]);
  });

  it('previews a template in a language and resets an override', async () => {
    const fetch = fakeFetch({ title: 'Orders is down', text: 'x' });
    const api = createNotificationsApi({ fetch });
    await api.previewTemplate('incident.down', 'pt-BR');
    expect(call(fetch)).toMatchObject({ url: '/api/notification-templates/incident.down/preview', method: 'POST', body: { locale: 'pt-BR' } });
    const reset = fakeFetch(null, 204);
    await createNotificationsApi({ fetch: reset }).resetTemplate('incident.down');
    expect(call(reset)).toMatchObject({ url: '/api/notification-templates/incident.down', method: 'DELETE' });
  });

  it('normalizes escalation step delays to minutes (ISO or seconds)', async () => {
    const fetch = fakeFetch([
      { id: 'p', name: 'Default', groupIds: [], steps: [{ after: 'PT15M', channelIds: ['ops'] }, { after: 1800, channelIds: [] }] },
    ]);
    const [policy] = await createNotificationsApi({ fetch }).listPolicies();
    expect(policy!.steps.map((s) => s.afterMinutes)).toEqual([15, 30]);
  });

  it('a missing endpoint means nothing configured', async () => {
    const fetch = fakeFetch({ detail: 'nope' }, 404);
    expect(await createNotificationsApi({ fetch }).listSchedules()).toEqual([]);
  });
});

describe('minutesOf', () => {
  it.each([
    ['PT0S', 0],
    ['PT5M', 5],
    ['PT1H30M', 90],
    ['P1DT1H', 1500],
    [900, 15],
    ['900.000000000', 15],
    [null, 0],
  ])('%s → %i min', (input, minutes) => expect(minutesOf(input)).toBe(minutes));
});
