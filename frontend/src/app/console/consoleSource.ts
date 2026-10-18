import { mockSnapshot } from '@/domains/wall/mock';
import type { ApiClient } from '@/shared/api/client';
import type { AccessInfo, Connection, MonitorDefinition, PreviewRequest, PreviewResult } from '@/shared/api/types';

const DEMO_CONNECTIONS: Connection[] = [
  { id: 'ora-core', name: 'Core Oracle', kind: 'ORACLE' },
  { id: 'pg-bi', name: 'BI Postgres', kind: 'POSTGRES' },
  { id: 'mssql-erp', name: 'ERP SQL Server', kind: 'SQLSERVER' },
];

/** Access in demo mode: the browser is the operator's own machine, so it can edit. */
export const DEMO_ACCESS: AccessInfo = { mode: 'edit', client: 'loopback' };

/** Simulated preview for demo mode (no probe data ever leaves this file). */
export async function mockPreview(target: PreviewRequest): Promise<PreviewResult> {
  if (target.type === 'SQL') {
    return {
      columns: [
        { name: 'PENDING_QTY', type: 'number' },
        { name: 'LAST_BATCH_AT', type: 'date' },
        { name: 'STATUS', type: 'text' },
      ],
      rows: [{ PENDING_QTY: 347, LAST_BATCH_AT: new Date(Date.now() - 14 * 60_000).toISOString(), STATUS: 'PROCESSING' }],
      elapsedMs: 143,
    };
  }
  return {
    columns: [
      { name: '$.status', type: 'text' },
      { name: '$.queue.size', type: 'number' },
    ],
    rows: [{ '$.status': 'UP', '$.queue.size': 42 }],
    elapsedMs: 212,
    status: 200,
  };
}

export type ConsoleApi = Pick<
  ApiClient,
  'getAccess' | 'listGroups' | 'listMonitors' | 'listConnections' | 'previewMonitor' | 'createMonitor'
>;

/** Console data source: the real API or, in demo mode, local data kept in memory only. */
export function createConsoleSource(api: ConsoleApi, demo: boolean): ConsoleApi {
  if (!demo) return api;
  const snapshot = mockSnapshot('incident');
  const created: MonitorDefinition[] = [];
  return {
    getAccess: async () => DEMO_ACCESS,
    listGroups: async () => snapshot.groups,
    listMonitors: async () => [
      ...snapshot.monitors,
      ...created.map((def, i) => ({
        id: `new-${i}`,
        name: def.name,
        groupId: def.groupId,
        type: def.type,
        status: 'OK' as const,
        value: null,
        since: new Date().toISOString(),
      })),
    ],
    listConnections: async () => DEMO_CONNECTIONS,
    previewMonitor: mockPreview,
    createMonitor: async (definition) => {
      created.push(definition);
      return definition;
    },
  };
}
