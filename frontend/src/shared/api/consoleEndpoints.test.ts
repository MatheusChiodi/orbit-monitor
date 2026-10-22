import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './apiClient';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function client(response: Response | (() => Response)) {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => (typeof response === 'function' ? response() : response));
  const api = createApiClient({ fetch: fetchMock, getOperator: () => 'Ana' });
  const call = (i = 0) => {
    const [url, init] = fetchMock.mock.calls[i] ?? [];
    return { url: String(url), method: init?.method, body: init?.body, headers: new Headers(init?.headers) };
  };
  return { api, call };
}

describe('console endpoints', () => {
  it('incidents: list, get, comment and ticket send the operator name', async () => {
    const { api, call } = client(() => json([]));
    await api.listIncidents();
    expect(call(0)).toMatchObject({ url: '/api/incidents', method: 'GET' });
    await api.getIncident('a/b');
    expect(call(1).url).toBe('/api/incidents/a%2Fb');
    await api.commentIncident('i1', 'Ana', 'looking');
    expect(call(2)).toMatchObject({ url: '/api/incidents/i1/comments', method: 'POST' });
    expect(JSON.parse(String(call(2).body))).toEqual({ by: 'Ana', text: 'looking' });
    await api.linkIncidentTicket('i1', 'Ana', 'OPS-1');
    expect(JSON.parse(String(call(3).body))).toEqual({ by: 'Ana', ticket: 'OPS-1' });
    await api.acknowledgeIncidentRecord('i1', 'Ana');
    expect(call(4)).toMatchObject({ url: '/api/incidents/i1/ack', method: 'POST' });
  });

  it('BE-26/27: resolve, reopen, status filter and the next escalation step (204 = none)', async () => {
    const { api, call } = client(() => json({}));
    await api.resolveIncident('i1', 'Ana');
    expect(call(0)).toMatchObject({ url: '/api/incidents/i1/resolve', method: 'POST' });
    expect(JSON.parse(String(call(0).body))).toEqual({ by: 'Ana' });
    await api.reopenIncident('i1', 'Ana');
    expect(call(1)).toMatchObject({ url: '/api/incidents/i1/reopen', method: 'POST' });
    await api.listIncidents({ status: 'OPEN' });
    expect(call(2).url).toBe('/api/incidents?status=OPEN');
    await api.getMonitor('m 1');
    expect(call(3).url).toBe('/api/monitors/m%201');
    const step = { incidentId: 'i1', stepName: 'Call DBA', dueAt: '2026-10-22T10:00:00Z' };
    expect(await client(json(step)).api.getIncidentEscalation('i1')).toMatchObject(step);
    expect(await client(new Response(null, { status: 204 })).api.getIncidentEscalation('i1')).toBeNull();
  });

  it('config lists accept a plain array or a {version, items} file and treat 404 as empty', async () => {
    expect(await client(json([{ id: 'm1' }])).api.listMaintenance()).toEqual([{ id: 'm1' }]);
    expect(await client(json({ version: 1, items: [{ id: 'd1', upstream: 'a', downstream: 'b' }] })).api.listDependencies()).toEqual([
      { id: 'd1', upstream: 'a', downstream: 'b' },
    ]);
    expect(await client(json({ title: 'Not Found' }, 404)).api.listStatusPages()).toEqual([]);
  });

  it('config items are saved with PUT /api/<resource>/{id} and removed with DELETE', async () => {
    const { api, call } = client(() => json({}));
    await api.saveMaintenance({ id: 'mw-1', name: 'Deploy', targets: ['g'], start: 's', end: 'e' });
    expect(call(0)).toMatchObject({ url: '/api/maintenance/mw-1', method: 'PUT' });
    await api.saveStatusPage({ id: 'sp', slug: 'payments' });
    expect(call(1)).toMatchObject({ url: '/api/status-pages/sp', method: 'PUT' });
    await api.saveDependency({ id: 'dep', upstream: 'a', downstream: 'b' });
    expect(call(2)).toMatchObject({ url: '/api/dependencies/dep', method: 'PUT' });
    await api.deleteMaintenance('mw-1');
    expect(call(3)).toMatchObject({ url: '/api/maintenance/mw-1', method: 'DELETE' });
    await api.listMaintenanceOccurrences({ from: 'a', to: 'b' });
    expect(call(4).url).toBe('/api/maintenance/occurrences?from=a&to=b');
  });

  it('FE-13: the order is persisted with one PUT /api/groups/order {groupIds, monitors}', async () => {
    const { api, call } = client(() => json([]));
    await api.saveGroupOrder({ groupIds: ['b', 'a'], monitors: { b: ['m2', 'm1'], a: [] } });
    expect(call(0)).toMatchObject({ url: '/api/groups/order', method: 'PUT' });
    expect(JSON.parse(String(call(0).body))).toEqual({ groupIds: ['b', 'a'], monitors: { b: ['m2', 'm1'], a: [] } });
  });

  it('BE-46: audit query sends filters and pagination; the total comes in X-Total-Count', async () => {
    const entry = { at: 't', operator: 'Ana', action: 'sql.save', target: 'm', detail: 'SELECT 1', remoteAddress: '127.0.0.1' };
    const { api, call } = client(() => new Response(JSON.stringify([entry]), { headers: { 'Content-Type': 'application/json', 'X-Total-Count': '120' } }));
    const page = await api.queryAudit({ action: 'sql.save', target: 'm', from: '2026-10-01T00:00:00Z', limit: 50, offset: 100 });
    expect(call(0).url).toBe('/api/audit?action=sql.save&target=m&from=2026-10-01T00%3A00%3A00Z&limit=50&offset=100');
    expect(page).toEqual({ items: [entry], total: 120 });
    expect(await client(json([])).api.queryAudit({})).toEqual({ items: [], total: null });
  });

  it('BE-13 catalog view is normalized to tables with typed columns', async () => {
    const view = { connectionId: 'ora', tables: [{ schema: 'APP', name: 'ORDERS', columns: ['ID', 'TOTAL'], columnTypes: ['NUMBER', 'NUMBER'] }] };
    expect(await client(json(view)).api.getCatalog('ora')).toEqual([
      { schema: 'APP', name: 'ORDERS', columns: [{ name: 'ID', type: 'NUMBER' }, { name: 'TOTAL', type: 'NUMBER' }] },
    ]);
  });

  it('catalog, history summary and coverage', async () => {
    const { api, call } = client(() => json([]));
    await api.getCatalog('ora core');
    expect(call(0).url).toBe('/api/connections/ora%20core/catalog');
    await api.getHistorySummary('m1', { from: '2026-10-01T00:00:00Z', to: '2026-10-02T00:00:00Z' });
    expect(call(1).url).toBe('/api/history/m1/summary?from=2026-10-01T00%3A00%3A00Z&to=2026-10-02T00%3A00%3A00Z');
    await api.getHistoryCoverage();
    expect(call(2).url).toBe('/api/history/coverage');
    await api.getHistory('m1', { from: 'a', to: 'b' }, '1h');
    expect(call(3).url).toBe('/api/history/m1?from=a&to=b&resolution=1h');
  });

  it('config export downloads the zip; import posts the zip with dryRun', async () => {
    const zip = new Blob([new Uint8Array([80, 75, 3, 4])], { type: 'application/zip' });
    const exp = client(new Response(new Uint8Array([80, 75, 3, 4]), { status: 200, headers: { 'Content-Type': 'application/zip' } }));
    const blob = await exp.api.exportConfig();
    expect(exp.call(0)).toMatchObject({ url: '/api/config/export', method: 'GET' });
    expect(blob.size).toBe(4);

    const imp = client(() => json([{ file: 'orbit.groups.json', added: ['g'], changed: [], removed: [] }]));
    const changes = await imp.api.importConfig(zip, true);
    expect(imp.call(0)).toMatchObject({ url: '/api/config/import?dryRun=true', method: 'POST' });
    expect(imp.call(0).headers.get('Content-Type')).toBe('application/zip');
    expect(imp.call(0).headers.get('X-Orbit-Operator')).toBe('Ana');
    expect(changes[0]?.file).toBe('orbit.groups.json');
    await imp.api.importConfig(zip, false);
    expect(imp.call(1).url).toBe('/api/config/import?dryRun=false');
  });

  it('settings: GET and PUT /api/settings', async () => {
    const { api, call } = client(() => json({ locale: 'en' }));
    await api.getSettings();
    expect(call(0)).toMatchObject({ url: '/api/settings', method: 'GET' });
    await api.saveSettings({ locale: 'pt-BR' });
    expect(call(1)).toMatchObject({ url: '/api/settings', method: 'PUT' });
    expect(await client(json({}, 404)).api.getConfigHealth()).toEqual([]);
  });
});
