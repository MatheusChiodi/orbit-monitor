import { mockSnapshot } from '@/domains/wall/mock';
import type { ApiClient } from '@/shared/api/apiClient';
import type { ConsoleEndpoints } from '@/shared/api/consoleEndpoints';
import { createDemoExtras } from './demoExtras';
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

type CoreApi = Pick<
  ApiClient,
  'getAccess' | 'listGroups' | 'listMonitors' | 'listConnections' | 'previewMonitor' | 'createMonitor'
>;

/** The console needs the core endpoints; screens beyond the monitor list use the extended ones when present. */
export type ConsoleApi = CoreApi & Partial<ConsoleEndpoints>;
/** What the screens read: every method is there (live, demo or "unavailable"). */
export type ConsoleSource = CoreApi & ConsoleEndpoints;

const EXTENDED_KEYS = [
  'getMonitor', 'listIncidents', 'getIncident', 'acknowledgeIncidentRecord', 'resolveIncident', 'reopenIncident', 'getIncidentEscalation', 'commentIncident', 'linkIncidentTicket',
  'listMaintenance', 'listMaintenanceOccurrences', 'saveMaintenance', 'deleteMaintenance', 'listDependencies', 'saveDependency', 'deleteDependency',
  'listStatusPages', 'saveStatusPage', 'saveGroupOrder', 'queryAudit', 'getCatalog', 'getHistorySummary', 'getHistory',
  'getHistoryCoverage', 'getWorkspaceDefaults', 'getSettings', 'saveSettings', 'getConfigHealth', 'exportConfig', 'importConfig',
] as const satisfies readonly (keyof ConsoleEndpoints)[];

const unavailable = () => Promise.reject(new Error('unavailable'));

function withFallbacks(api: ConsoleApi, fallback: Partial<ConsoleEndpoints>): ConsoleSource {
  const extended = Object.fromEntries(EXTENDED_KEYS.map((key) => [key, api[key] ?? fallback[key] ?? unavailable]));
  return { ...api, ...(extended as ConsoleEndpoints) };
}

/** Console data source: the real API or, in demo mode, local data kept in memory only. */
export function createConsoleSource(api: ConsoleApi, demo: boolean): ConsoleSource {
  if (!demo) return withFallbacks(api, {});
  const snapshot = mockSnapshot('incident');
  const created: MonitorDefinition[] = [];
  const extras = createDemoExtras(snapshot);
  return withFallbacks({
    ...extras,
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
  }, {});
}
