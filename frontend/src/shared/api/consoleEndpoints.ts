import type {
  AuditEntry,
  AuditFilter,
  AuditPage,
  CatalogTable,
  ConfigFileChange,
  ConfigFileHealthRecord,
  DependencyItem,
  EscalationStep,
  HistoryCoverageInfo,
  HistorySummary,
  IncidentRecord,
  MaintenanceItem,
  MaintenanceOccurrence,
  MonitorDetailRecord,
  OrbitSettingsRecord,
  StatusPageRecord,
} from './consoleTypes';
import type { HistoryResponse } from '@/domains/telemetry/history/historyApi';
import type { WorkspacePreferenceDefaults } from '@/shared/preferences/preferences';
import type { Group } from './types';

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
    acknowledgeIncidentRecord: (id: string, by: string) =>
      request<IncidentRecord>(`/api/incidents/${enc(id)}/ack`, { method: 'POST', body: { by } }),
    resolveIncident: (id: string, by: string) =>
      request<IncidentRecord>(`/api/incidents/${enc(id)}/resolve`, { method: 'POST', body: { by } }),
    reopenIncident: (id: string, by: string) =>
      request<IncidentRecord>(`/api/incidents/${enc(id)}/reopen`, { method: 'POST', body: { by } }),
    getIncidentEscalation: async (id: string) =>
      (await request<EscalationStep | undefined>(`/api/incidents/${enc(id)}/escalation`)) ?? null,
    commentIncident: (id: string, by: string, text: string) =>
      request<IncidentRecord>(`/api/incidents/${enc(id)}/comments`, { method: 'POST', body: { by, text } }),
    linkIncidentTicket: (id: string, by: string, ticket: string) =>
      request<IncidentRecord>(`/api/incidents/${enc(id)}/ticket`, { method: 'POST', body: { by, ticket } }),

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

    /** FE-13: group order and, optionally, each group's monitors in order (a monitor listed elsewhere moves). */
    saveGroupOrder: (order: GroupOrder) => request<Group[]>('/api/groups/order', { method: 'PUT', body: order }),

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
    getHistorySummary: (monitorId: string, range: { from: string; to: string }) =>
      request<HistorySummary>(`/api/history/${enc(monitorId)}/summary${query(range)}`),
    /** BE-52 `GET /api/history/{id}?from&to&resolution` (FE-58 history window). */
    getHistory: (monitorId: string, range: { from: string; to: string }, resolution?: 'raw' | '1m' | '1h') =>
      request<HistoryResponse>(`/api/history/${enc(monitorId)}${query({ ...range, resolution })}`),
    getHistoryCoverage: () => request<HistoryCoverageInfo>('/api/history/coverage'),

    /** BE-40 workspace defaults (theme, animation, density, locale, scale) under each device's choices. */
    getWorkspaceDefaults: () => request<WorkspacePreferenceDefaults>('/api/settings/defaults'),
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
