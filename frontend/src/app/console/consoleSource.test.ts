import { describe, expect, it, vi } from 'vitest';
import { DEMO_TOKEN, createConsoleSource, demoSession, mockPreview } from './consoleSource';

describe('mockPreview', () => {
  it('SQL devolve colunas tipadas', async () => {
    const result = await mockPreview({ type: 'SQL', connectionId: 'c', sql: 'SELECT 1' });
    expect(result.columns.map((c) => c.type)).toEqual(['number', 'date', 'text']);
    expect(result.rows).toHaveLength(1);
  });
  it('HTTP devolve status e campos JSONPath', async () => {
    const result = await mockPreview({ type: 'HTTP', method: 'GET', url: 'https://x', headers: {} });
    expect(result.status).toBe(200);
    expect(result.columns[0]?.name).toBe('$.status');
  });
});

describe('createConsoleSource', () => {
  it('demonstração usa dados locais e não chama a API', async () => {
    const api = { listGroups: vi.fn(), listMonitors: vi.fn(), listConnections: vi.fn(), previewMonitor: vi.fn(), createMonitor: vi.fn() };
    const source = createConsoleSource(api, true);
    expect((await source.listGroups()).length).toBeGreaterThan(0);
    expect((await source.listMonitors()).length).toBeGreaterThan(0);
    expect((await source.listConnections()).length).toBeGreaterThan(0);
    await source.createMonitor({
      name: 'x', groupId: 'pag', intervalSeconds: 60, timeoutSeconds: 5, retries: 2, conditions: [], fields: [],
      type: 'SQL', connectionId: 'c', sql: 'SELECT 1',
    });
    expect(api.listGroups).not.toHaveBeenCalled();
    expect(api.createMonitor).not.toHaveBeenCalled();
  });

  it('com backend delega à API', async () => {
    const api = {
      listGroups: vi.fn().mockResolvedValue([]),
      listMonitors: vi.fn().mockResolvedValue([]),
      listConnections: vi.fn().mockResolvedValue([]),
      previewMonitor: vi.fn().mockResolvedValue({ columns: [], rows: [], elapsedMs: 1 }),
      createMonitor: vi.fn().mockResolvedValue({}),
    };
    const source = createConsoleSource(api, false);
    await source.listGroups();
    await source.previewMonitor({ type: 'SQL', connectionId: 'c', sql: 'SELECT 1' });
    expect(api.listGroups).toHaveBeenCalled();
    expect(api.previewMonitor).toHaveBeenCalled();
  });
});

describe('demoSession', () => {
  it('admin com token de demonstração', () => {
    expect(demoSession().token).toBe(DEMO_TOKEN);
    expect(demoSession().user.role).toBe('admin');
  });
});
