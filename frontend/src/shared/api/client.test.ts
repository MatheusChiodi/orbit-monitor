import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './client';
import { createApiClient } from './apiClient';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createApiClient', () => {
  it('GETs /api/wall/snapshot and returns the typed JSON', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ environment: 'Production' }));
    const api = createApiClient({ fetch: fetchMock });
    const snapshot = await api.getWallSnapshot();
    expect(snapshot.environment).toBe('Production');
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/wall/snapshot');
    expect(init?.method).toBe('GET');
  });

  it('never sends an operator name (X-Orbit-Operator) nor an Authorization header', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([]));
    const api = createApiClient({ fetch: fetchMock });
    await api.listGroups();
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.has('X-Orbit-Operator')).toBe(false);
    expect(headers.get('Authorization')).toBeNull();
  });

  it('CORE-15: sends the UI language as Accept-Language so Problem Details come translated', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([]));
    await createApiClient({ fetch: fetchMock, getLocale: () => 'pt-BR' }).listGroups();
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Accept-Language')).toBe('pt-BR');
  });

  it('never lets the browser cache API responses', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([]));
    await createApiClient({ fetch: fetchMock }).listMonitors();
    expect(fetchMock.mock.calls[0]?.[1]?.cache).toBe('no-store');
  });

  it('acknowledgement POST carries no name: the server records the client kind', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ id: 'i1', acknowledgedBy: 'lan' }));
    const api = createApiClient({ fetch: fetchMock, baseUrl: 'http://h' });
    const incident = await api.acknowledgeIncident('i1');
    expect(incident.acknowledgedBy).toBe('lan');
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('http://h/api/incidents/i1/ack');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBeUndefined();
  });

  it('reads the access mode from /api/access', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ mode: 'view-only', client: 'lan' }));
    const access = await createApiClient({ fetch: fetchMock }).getAccess();
    expect(access.mode).toBe('view-only');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/access');
  });

  it('uses the Problem Details detail as the error message', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ title: 'Forbidden', detail: 'Edits only from loopback' }, 403));
    await expect(createApiClient({ fetch: fetchMock }).createMonitor({} as never)).rejects.toThrow('Edits only from loopback');
  });

  it('SQL monitor preview', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ columns: [{ name: 'QTD', type: 'number' }], rows: [{ QTD: 3 }], elapsedMs: 12 }));
    const api = createApiClient({ fetch: fetchMock });
    const result = await api.previewMonitor({ type: 'SQL', connectionId: 'c1', sql: 'SELECT 1' });
    expect(result.columns[0]?.name).toBe('QTD');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/monitors/preview');
  });

  it('throws ApiError with the server status and message', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ message: 'SELECT only' }, 422));
    const api = createApiClient({ fetch: fetchMock });
    const error = await api.listMonitors().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).message).toBe('SELECT only');
  });

  it('throws a generic ApiError when the body has no JSON', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('x', { status: 500 }));
    const api = createApiClient({ fetch: fetchMock });
    await expect(api.listGroups()).rejects.toThrow('Request failed (500)');
  });

  it('204 returns undefined', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const api = createApiClient({ fetch: fetchMock });
    await expect(api.request<void>('/api/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
