import type {
  AuditEntry,
  AuditFilter,
  AuditPage,
  BulkMonitorAction,
  BulkMonitorResult,
  CatalogTable,
  ConfigFileChange,
  ConfigFileHealthRecord,
  ConnectionInput,
  ConnectionTestResult,
  DependencyItem,
  EscalationStep,
  GroupInput,
  HistoryEventRecord,
  HistoryCoverageInfo,
  HistorySummary,
  IncidentRecord,
  MaintenanceItem,
  MaintenanceOccurrence,
  MonitorDetailRecord,
  MonitorRunResult,
  OrbitSettingsRecord,
  PostmortemRecord,
  SavedQuery,
  SilenceRecord,
  StatusPageRecord,
} from './consoleTypes';
import type { HistoryResponse } from '@/domains/telemetry/history/historyApi';
import type { WorkspacePreferenceDefaults } from '@/shared/preferences/preferences';
import type { Connection, Group } from './types';

/** Body of `PUT /api/groups/order`. */
export interface GroupOrder {
  groupIds: string[];
  monitors?: Record<string, string[]>;
}

type HttpVerb = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type JsonRequest = <T>(path: string, options?: { method?: HttpVerb; body?: unknown }) => Promise<T>;
export type RawRequest = (path: string, options?: { method?: HttpVerb; body?: Blob; contentType?: string }) => Promise<Response>;
type NotFoundCheck = (error: unknown) => boolean;

const enc = encodeURIComponent;

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') search.set(key, String(value));
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** Lists come as a plain array (current controllers) or as the `{ version, items }` file shape. */
function itemsOf<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && 'items' in data && Array.isArray(data.items)) return data.items as T[];
  return [];
}

interface CatalogViewTable {
  schema?: string | null;
  name: string;
  columns: (string | { name: string; type: string })[];
  columnTypes?: string[];
}

function itemsOfCatalog(data: unknown): CatalogTable[] {
  const tables = data && typeof data === 'object' && 'tables' in data && Array.isArray(data.tables) ? (data.tables as CatalogViewTable[]) : itemsOf<CatalogViewTable>(data);
  return tables.map((table) => ({
    schema: table.schema ?? null,
    name: table.name,
    columns: table.columns.map((column, i) => (typeof column === 'string' ? { name: column, type: table.columnTypes?.[i] ?? '' } : column)),
  }));
}

/** Endpoints used by the console screens; built on the client's JSON and raw requests. */
export function createConsoleEndpoints(request: JsonRequest, raw: RawRequest, isNotFound: NotFoundCheck) {
  async function list<T>(path: string): Promise<T[]> {
    try {
      return itemsOf<T>(await request<unknown>(path));
    } catch (error) {
      if (isNotFound(error)) return [];
      throw error;
    }
  }
  const put = <T extends { id: string }>(resource: string, item: T) =>
    request<T>(`/api/${resource}/${enc(item.id)}`, { method: 'PUT', body: item });
  const remove = (resource: string, id: string) => request<void>(`/api/${resource}/${enc(id)}`, { method: 'DELETE' });

  return {
    getMonitor: (id: string) => request<MonitorDetailRecord>(`/api/monitors/${enc(id)}`),
    listIncidents: (filter: { status?: 'OPEN' | 'RESOLVED'; monitorId?: string } = {}) =>
      request<IncidentRecord[]>(`/api/incidents${query(filter)}`),
    getIncident: (id: string) => request<IncidentRecord>(`/api/incidents/${enc(id)}`),
    // Incident actions carry no name: the server records the client kind (`loopback`, `lan`, `unknown`).
    acknowledgeIncidentRecord: (id: string) => request<IncidentRecord>(`/api/incidents/${enc(id)}/ack`, { method: 'POST' }),
    resolveIncident: (id: string) => request<IncidentRecord>(`/api/incidents/${enc(id)}/resolve`, { method: 'POST' }),
    reopenIncident: (id: string) => request<IncidentRecord>(`/api/incidents/${enc(id)}/reopen`, { method: 'POST' }),
    getIncidentEscalation: async (id: string) =>
      (await request<EscalationStep | undefined>(`/api/incidents/${enc(id)}/escalation`)) ?? null,
    commentIncident: (id: string, text: string) =>
      request<IncidentRecord>(`/api/incidents/${enc(id)}/comments`, { method: 'POST', body: { text } }),
    linkIncidentTicket: (id: string, ticket: string) =>
      request<IncidentRecord>(`/api/incidents/${enc(id)}/ticket`, { method: 'POST', body: { ticket } }),

    listMaintenance: () => list<MaintenanceItem>('/api/maintenance'),
    listMaintenanceOccurrences: (range: { from: string; to: string }) =>
      request<MaintenanceOccurrence[]>(`/api/maintenance/occurrences${query(range)}`),
    saveMaintenance: (item: MaintenanceItem) => put('maintenance', item),
    deleteMaintenance: (id: string) => remove('maintenance', id),
    listDependencies: () => list<DependencyItem>('/api/dependencies'),
    saveDependency: (item: DependencyItem) => put('dependencies', item),
    deleteDependency: (id: string) => remove('dependencies', id),
    listStatusPages: () => list<StatusPageRecord>('/api/status-pages'),
    saveStatusPage: (item: StatusPageRecord) => put('status-pages', item),
    deleteStatusPage: (id: string) => remove('status-pages', id),

    /** FE-13: group order and, optionally, each group's monitors in order (a monitor listed elsewhere moves). */
    saveGroupOrder: (order: GroupOrder) => request<Group[]>('/api/groups/order', { method: 'PUT', body: order }),
    /** Creates or renames a group (`PUT /api/groups/{id}`). */
    saveGroup: ({ id, ...group }: GroupInput) => request<Group>(`/api/groups/${enc(id)}`, { method: 'PUT', body: group }),
    /** 409 `group-not-empty` while monitors belong to it; `moveTo` moves them to that group first. */
    deleteGroup: (id: string, moveTo?: string) =>
      request<void>(`/api/groups/${enc(id)}${query({ moveTo })}`, { method: 'DELETE' }),
    deleteMonitor: (id: string) => remove('monitors', id),
    pauseMonitor: (id: string) => request<MonitorDetailRecord>(`/api/monitors/${enc(id)}/pause`, { method: 'POST' }),
    resumeMonitor: (id: string) => request<MonitorDetailRecord>(`/api/monitors/${enc(id)}/resume`, { method: 'POST' }),
    /** The copy (new id, "<name> (copy)", not paused; secrets copied on the server). */
    duplicateMonitor: (id: string) => request<MonitorDetailRecord>(`/api/monitors/${enc(id)}/duplicate`, { method: 'POST' }),
    /** "Run now": runs the check at once and answers with its result. */
    runMonitor: (id: string) => request<MonitorRunResult>(`/api/monitors/${enc(id)}/run`, { method: 'POST' }),
    bulkMonitors: (ids: string[], action: BulkMonitorAction, groupId?: string) =>
      request<BulkMonitorResult>('/api/monitors/bulk', { method: 'POST', body: { ids, action, groupId } }),
    listSilences: () => list<SilenceRecord>('/api/silences'),
    createSilence: (silence: { target: string; reason: string; minutes: number }) =>
      request<SilenceRecord>('/api/silences', { method: 'POST', body: silence }),
    liftSilence: (id: string) => remove('silences', id),
    getPostmortem: (id: string) => request<PostmortemRecord>(`/api/incidents/${enc(id)}/postmortem`),
    listEvents: (filter: { monitorId?: string; from?: string; to?: string; limit?: number } = {}) =>
      request<HistoryEventRecord[]>(`/api/events${query(filter)}`),

    /** Database connections (orbit.connections.json); passwords are write-only. */
    saveConnection: (id: string, connection: ConnectionInput) =>
      request<Connection>(`/api/connections/${enc(id)}`, { method: 'PUT', body: connection }),
    /** 409 `connection-in-use` while SQL monitors use it; `force` pauses those monitors and deletes. */
    deleteConnection: (id: string, force = false) =>
      request<void>(`/api/connections/${enc(id)}${force ? '?force=true' : ''}`, { method: 'DELETE' }),
    testConnection: (id: string) => request<ConnectionTestResult>(`/api/connections/${enc(id)}/test`, { method: 'POST' }),
    /** Tests typed settings without saving; with `id` and no password the stored password is used. */
    testConnectionDraft: (draft: ConnectionInput & { id?: string }) =>
      request<ConnectionTestResult>('/api/connections/test', { method: 'POST', body: draft }),
    /** New secret push URL for a push monitor; the old one stops working at once. */
    regeneratePushToken: (id: string) => request<{ monitorId: string; pushUrl: string }>(`/api/monitors/${enc(id)}/push-token`, { method: 'POST' }),

    /** BE-46: newest first; the number of matching entries comes in `X-Total-Count`. */
    queryAudit: async (filter: AuditFilter): Promise<AuditPage> => {
      const response = await raw(`/api/audit${query({ ...filter })}`);
      const header = response.headers.get('X-Total-Count');
      const total = header !== null && /^\d+$/.test(header) ? Number(header) : null;
      return { items: itemsOf<AuditEntry>(await response.json()), total };
    },

    /** `SqlCatalogController.CatalogView` (`{connectionId, tables[{schema, name, columns[], columnTypes[]}]}`). */
    getCatalog: async (connectionId: string): Promise<CatalogTable[]> => {
      const data = await request<unknown>(`/api/connections/${enc(connectionId)}/catalog`);
      return itemsOfCatalog(data);
    },
    listSavedQueries: (connectionId: string) => list<SavedQuery>(`/api/query-catalog${query({ connectionId })}`),
    saveSavedQuery: ({ id, ...saved }: SavedQuery) => request<SavedQuery>(`/api/query-catalog/${enc(id)}`, { method: 'PUT', body: saved }),
    deleteSavedQuery: (id: string) => remove('query-catalog', id),
    getHistorySummary: (monitorId: string, range: { from: string; to: string }) =>
      request<HistorySummary>(`/api/history/${enc(monitorId)}/summary${query(range)}`),
    /** BE-52 `GET /api/history/{id}?from&to&resolution` (FE-58 history window). */
    getHistory: (monitorId: string, range: { from: string; to: string }, resolution?: 'raw' | '1m' | '1h') =>
      request<HistoryResponse>(`/api/history/${enc(monitorId)}${query({ ...range, resolution })}`),
    getHistoryCoverage: () => request<HistoryCoverageInfo>('/api/history/coverage'),

    /** BE-40 workspace defaults (theme, animation, density, locale, scale) under each device's choices. */
    getWorkspaceDefaults: () => request<WorkspacePreferenceDefaults>('/api/settings/defaults'),
    saveWorkspaceDefaults: (defaults: WorkspacePreferenceDefaults) =>
      request<WorkspacePreferenceDefaults>('/api/settings/defaults', { method: 'PUT', body: defaults }),
    getSettings: () => request<OrbitSettingsRecord>('/api/settings'),
    saveSettings: (settings: OrbitSettingsRecord) => request<OrbitSettingsRecord>('/api/settings', { method: 'PUT', body: settings }),
    /** Assumed contract (CORE-19/BE-50): state of every `orbit.<feature>.json`; 404 = not offered. */
    getConfigHealth: () => list<ConfigFileHealthRecord>('/api/config/health'),
    exportConfig: async () => (await raw('/api/config/export')).blob(),
    importConfig: async (zip: Blob, dryRun: boolean) => {
      const response = await raw(`/api/config/import?dryRun=${dryRun}`, { method: 'POST', body: zip, contentType: 'application/zip' });
      return (await response.json()) as ConfigFileChange[];
    },
  };
}

export type ConsoleEndpoints = ReturnType<typeof createConsoleEndpoints>;
