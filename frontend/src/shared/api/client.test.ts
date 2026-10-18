import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createApiClient', () => {
  it('faz GET em /api/wall/snapshot e devolve o JSON tipado', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ environment: 'Produção' }));
    const api = createApiClient({ fetch: fetchMock });
    const snapshot = await api.getWallSnapshot();
    expect(snapshot.environment).toBe('Produção');
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/wall/snapshot');
    expect(init?.method).toBe('GET');
  });

  it('envia o token como Bearer quando existe', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([]));
    const api = createApiClient({ fetch: fetchMock, getToken: () => 'abc' });
    await api.listGroups();
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get('Authorization')).toBe('Bearer abc');
  });

  it('POST de reconhecimento com corpo JSON', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ id: 'i1', acknowledgedBy: 'Ana' }));
    const api = createApiClient({ fetch: fetchMock, baseUrl: 'http://h' });
    const incident = await api.acknowledgeIncident('i1', 'Ana');
    expect(incident.acknowledgedBy).toBe('Ana');
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('http://h/api/incidents/i1/ack');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ by: 'Ana' });
  });

  it('login devolve token e usuário', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ token: 't', user: { id: 'u', name: 'Ana', role: 'admin' } }));
    const api = createApiClient({ fetch: fetchMock });
    const session = await api.login({ username: 'ana', password: 'x' });
    expect(session.user.name).toBe('Ana');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ username: 'ana', password: 'x' });
  });

  it('preview de monitor SQL', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ columns: [{ name: 'QTD', type: 'number' }], rows: [{ QTD: 3 }], elapsedMs: 12 }));
    const api = createApiClient({ fetch: fetchMock });
    const result = await api.previewMonitor({ type: 'SQL', connectionId: 'c1', sql: 'SELECT 1' });
    expect(result.columns[0]?.name).toBe('QTD');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/monitors/preview');
  });

  it('lança ApiError com status e mensagem do servidor', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ message: 'Somente SELECT' }, 422));
    const api = createApiClient({ fetch: fetchMock });
    const error = await api.listMonitors().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).message).toBe('Somente SELECT');
  });

  it('lança ApiError genérico em falha sem corpo JSON', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('x', { status: 500 }));
    const api = createApiClient({ fetch: fetchMock });
    await expect(api.listGroups()).rejects.toThrow('Falha na requisição (500)');
  });

  it('204 devolve undefined', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const api = createApiClient({ fetch: fetchMock });
    await expect(api.request<void>('/api/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
