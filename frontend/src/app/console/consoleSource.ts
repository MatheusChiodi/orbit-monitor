import { mockSnapshot } from '@/domains/wall/mock';
import type { ApiClient } from '@/shared/api/client';
import type { Connection, MonitorDefinition, PreviewRequest, PreviewResult, Session } from '@/shared/api/types';

export const DEMO_TOKEN = 'demo';

export function demoSession(): Session {
  return { token: DEMO_TOKEN, user: { id: 'demo', name: 'Demonstração', role: 'admin' } };
}

const DEMO_CONNECTIONS: Connection[] = [
  { id: 'ora-core', name: 'Oracle Core', kind: 'ORACLE' },
  { id: 'pg-bi', name: 'Postgres BI', kind: 'POSTGRES' },
  { id: 'mssql-erp', name: 'SQL Server ERP', kind: 'SQLSERVER' },
];

/** Preview simulado para o modo demonstração. */
export async function mockPreview(target: PreviewRequest): Promise<PreviewResult> {
  if (target.type === 'SQL') {
    return {
      columns: [
        { name: 'QTD_PENDENTES', type: 'number' },
        { name: 'DT_ULT_LOTE', type: 'date' },
        { name: 'STATUS', type: 'text' },
      ],
      rows: [{ QTD_PENDENTES: 347, DT_ULT_LOTE: new Date(Date.now() - 14 * 60_000).toISOString(), STATUS: 'PROCESSANDO' }],
      elapsedMs: 143,
    };
  }
  return {
    columns: [
      { name: '$.status', type: 'text' },
      { name: '$.fila.tamanho', type: 'number' },
    ],
    rows: [{ '$.status': 'UP', '$.fila.tamanho': 42 }],
    elapsedMs: 212,
    status: 200,
  };
}

export type ConsoleApi = Pick<ApiClient, 'listGroups' | 'listMonitors' | 'listConnections' | 'previewMonitor' | 'createMonitor'>;

/** Fonte de dados do console: a API real ou, em demonstração, dados locais. */
export function createConsoleSource(api: ConsoleApi, demo: boolean): ConsoleApi {
  if (!demo) return api;
  const snapshot = mockSnapshot('incident');
  const created: MonitorDefinition[] = [];
  return {
    listGroups: async () => snapshot.groups,
    listMonitors: async () => [
      ...snapshot.monitors,
      ...created.map((def, i) => ({
        id: `novo-${i}`,
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
