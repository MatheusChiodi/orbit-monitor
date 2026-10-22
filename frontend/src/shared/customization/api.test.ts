import { describe, expect, it, vi } from 'vitest';
import { createCustomizationApi, decodeInstanceTarget, encodeInstanceTarget, entryId, fromEntries } from './api';

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

type Call = [RequestInfo | URL, RequestInit | undefined];

function fetchStub(respond: (url: RequestInfo | URL, init?: RequestInit) => Response) {
  return vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => respond(url, init));
}

function call(mock: ReturnType<typeof fetchStub>, index: number): Call {
  return mock.mock.calls[index] as Call;
}

describe('customization API (BE-51 contract)', () => {
  it('reads orbit.customization.json entries and splits them into scopes and profiles', async () => {
    const fetchMock = fetchStub(() =>
      jsonResponse(200, {
        version: 1,
        items: [
          { id: 'workspace', scope: 'workspace', target: null, values: { 'card.monitor.variant': 'compact', 'evil.key': 1 } },
          { id: 'layout:noc', scope: 'layout', target: 'noc', values: { 'card.monitor.variant': 'detailed' } },
          { id: 'instance:card.monitor.m1', scope: 'instance', target: 'card.monitor.m1', values: { 'card.monitor.title': 'Queue' } },
          { id: 'instance:unknown-target', scope: 'instance', target: 'unknown-target', values: { 'card.monitor.title': 'X' } },
          { id: 'profile:night', scope: 'profile', target: 'night', name: 'Night shift', values: { 'shape.glass': false } },
          { id: 'garbage' },
        ],
      }),
    );
    const api = createCustomizationApi({ fetch: fetchMock });
    const data = await api.load();
    expect(call(fetchMock, 0)[0]).toBe('/api/customization');
    expect(data.workspace).toEqual({ 'card.monitor.variant': 'compact' });
    expect(data.layouts).toEqual({ noc: { 'card.monitor.variant': 'detailed' } });
    expect(data.instances).toEqual({ 'card.monitor:m1': { 'card.monitor.title': 'Queue' } });
    expect(data.profiles).toEqual([{ id: 'profile:night', name: 'Night shift', settings: { 'shape.glass': false } }]);
  });

  it('maps instance ids to targets without a colon and back', () => {
    expect(encodeInstanceTarget('card.monitor:sel_queue')).toBe('card.monitor.sel_queue');
    expect(decodeInstanceTarget('card.group.pay')).toBe('card.group:pay');
    expect(decodeInstanceTarget('card.monitor.')).toBeNull();
  });

  it('treats a missing file (404) as nothing customized yet', async () => {
    const api = createCustomizationApi({ fetch: fetchStub(() => jsonResponse(404, { detail: 'missing' })) });
    expect(await api.load()).toEqual(fromEntries([]));
  });

  it('replaces one scope with PUT { values } and resets it with DELETE', async () => {
    const fetchMock = fetchStub((_url, init) => (init?.method === 'DELETE' ? jsonResponse(204) : jsonResponse(200, {})));
    const api = createCustomizationApi({ fetch: fetchMock, getOperator: () => 'Ana' });
    await api.saveScope('layout', 'noc', { 'card.monitor.variant': 'compact' });
    const [url, init] = call(fetchMock, 0);
    expect(url).toBe('/api/customization/layout/noc');
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(String(init?.body))).toEqual({ values: { 'card.monitor.variant': 'compact' } });
    await api.saveScope('instance', 'card.monitor:m1', { 'card.monitor.title': 'Queue' });
    expect(call(fetchMock, 1)[0]).toBe('/api/customization/instance/card.monitor.m1');
    await api.deleteEntry(entryId('workspace'));
    expect(call(fetchMock, 2)[0]).toBe('/api/customization/workspace');
    expect(call(fetchMock, 2)[1]?.method).toBe('DELETE');
  });

  it('never sends the device scope to the server', async () => {
    const api = createCustomizationApi({ fetch: vi.fn() });
    await expect(api.saveScope('device' as never, null, {})).rejects.toThrow(/device/);
  });

  it('reads and writes the terminology per locale and drops invalid terms', async () => {
    const fetchMock = fetchStub((_url, init) =>
      init?.method === 'PUT'
        ? jsonResponse(200, {})
        : jsonResponse(200, { version: 1, items: [{ id: 'en', terms: { 'status.label.DOWN': 'Offline', 'bad key!': 'x', 'app.name': '', 'app.console': '<b>x</b>' } }, { id: 'xx', terms: {} }] }),
    );
    const api = createCustomizationApi({ fetch: fetchMock });
    expect(await api.loadTerminology()).toEqual({ en: { 'status.label.DOWN': 'Offline' }, 'pt-BR': {} });
    await api.saveTerminology('pt-BR', { 'status.label.DOWN': 'Fora do ar' });
    expect(call(fetchMock, 1)[0]).toBe('/api/terminology/pt-BR');
    expect(JSON.parse(String(call(fetchMock, 1)[1]?.body))).toEqual({ terms: { 'status.label.DOWN': 'Fora do ar' } });
  });

  it('saves profiles under /profile/{slug} with name and values', async () => {
    const fetchMock = fetchStub(() => jsonResponse(200, {}));
    const api = createCustomizationApi({ fetch: fetchMock });
    await api.saveProfile({ id: 'profile:night', name: 'Night shift', settings: { 'shape.glass': false, 'not.real': 2 } });
    expect(call(fetchMock, 0)[0]).toBe('/api/customization/profile/night');
    expect(JSON.parse(String(call(fetchMock, 0)[1]?.body))).toEqual({ name: 'Night shift', values: { 'shape.glass': false } });
  });

  it('lists the wall layout ids that can hold layout-scoped values', async () => {
    const fetchMock = fetchStub(() => jsonResponse(200, { version: 1, items: [{ id: 'noc', name: 'NOC' }, { id: 'bad id!' }, { name: 'no id' }] }));
    const api = createCustomizationApi({ fetch: fetchMock });
    expect(await api.listLayoutIds?.()).toEqual(['noc']);
    expect(call(fetchMock, 0)[0]).toBe('/api/layouts');
  });
});
