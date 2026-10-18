import { describe, expect, it, vi } from 'vitest';
import { DEMO_ACCESS, createConsoleSource, mockPreview, type ConsoleApi } from './consoleSource';

function fakeApi(): ConsoleApi {
  return {
    getAccess: vi.fn().mockResolvedValue({ mode: 'view-only', client: 'lan' }),
    listGroups: vi.fn().mockResolvedValue([]),
    listMonitors: vi.fn().mockResolvedValue([]),
    listConnections: vi.fn().mockResolvedValue([]),
    previewMonitor: vi.fn().mockResolvedValue({ columns: [], rows: [], elapsedMs: 1 }),
    createMonitor: vi.fn().mockResolvedValue({}),
  };
}

describe('mockPreview', () => {
  it('SQL returns typed columns', async () => {
    const result = await mockPreview({ type: 'SQL', connectionId: 'c', sql: 'SELECT 1' });
    expect(result.columns.map((c) => c.type)).toEqual(['number', 'date', 'text']);
    expect(result.rows).toHaveLength(1);
  });
  it('HTTP returns the status and JSONPath fields', async () => {
    const result = await mockPreview({ type: 'HTTP', method: 'GET', url: 'https://x', headers: {} });
    expect(result.status).toBe(200);
    expect(result.columns[0]?.name).toBe('$.status');
  });
});

describe('createConsoleSource', () => {
  it('demo mode uses local data and never calls the API', async () => {
    const api = fakeApi();
    const source = createConsoleSource(api, true);
    expect(await source.getAccess()).toEqual(DEMO_ACCESS);
    expect((await source.listGroups()).length).toBeGreaterThan(0);
    expect((await source.listMonitors()).length).toBeGreaterThan(0);
    expect((await source.listConnections()).length).toBeGreaterThan(0);
    await source.createMonitor({
      name: 'x',
      groupId: 'pay',
      intervalSeconds: 60,
      timeoutSeconds: 5,
      retries: 2,
      conditions: [],
      fields: [],
      type: 'SQL',
      connectionId: 'c',
      sql: 'SELECT 1',
    });
    expect((await source.listMonitors()).some((m) => m.name === 'x')).toBe(true);
    expect(api.listGroups).not.toHaveBeenCalled();
    expect(api.createMonitor).not.toHaveBeenCalled();
  });

  it('with a backend it delegates to the API', async () => {
    const api = fakeApi();
    const source = createConsoleSource(api, false);
    await source.listGroups();
    await source.previewMonitor({ type: 'SQL', connectionId: 'c', sql: 'SELECT 1' });
    expect(api.listGroups).toHaveBeenCalled();
    expect(api.previewMonitor).toHaveBeenCalled();
  });
});
