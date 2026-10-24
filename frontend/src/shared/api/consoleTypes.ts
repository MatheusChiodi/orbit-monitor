import type { Status } from './types';

/**
 * Console contract for the extended screens (incidents, maintenance, dependencies, status pages,
 * reports, audit, catalog, config transfer). Shapes mirror the backend records; where an endpoint
 * is still being built the shape follows the feature's context file (see FE-* "Decisions and notes").
 */

export type BackendState = Status | 'UNKNOWN';

export type IncidentEventType =
  | 'OPENED'
  | 'SEVERITY_CHANGED'
  | 'ACKNOWLEDGED'
  | 'COMMENTED'
  | 'TICKET_LINKED'
  | 'RESOLVED'
  | 'REOPENED'
  | 'FLAPPING_STARTED'
  | 'FLAPPING_STOPPED'
  | 'CORRELATED';

export interface IncidentEventRecord {
  type: IncidentEventType;
  /** Client kind (`loopback`, `lan`, `unknown`) or `orbit` for system events; older data may hold a name. */
  actor: string;
  at: string;
  detail: string | null;
}

/** `GET /api/incidents` and `GET /api/incidents/{id}` (io.orbit.alerting.Incident). */
export interface IncidentRecord {
  id: string;
  monitorId: string;
  status: 'OPEN' | 'RESOLVED';
  severity: BackendState;
  openedAt: string;
  resolvedAt: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  ticket: string | null;
  /** BE-25: one incident is kept while the monitor flaps. */
  flapping?: boolean;
  /** BE-30: upstream incident this one is correlated to. */
  parentId?: string | null;
  events: IncidentEventRecord[];
  /** Optional extras some backends add (BE-27 escalation, BE-30 blast radius). */
  escalatesAt?: string | null;
  impact?: string[];
}

/** Item of `orbit.maintenance.json` (BE-31). */
export interface MaintenanceItem {
  id: string;
  name?: string | null;
  /** Monitor or group ids covered by the window. */
  targets?: string[] | null;
  start?: string | null;
  end?: string | null;
  cron?: string | null;
  durationMinutes?: number | null;
  zone?: string | null;
  reason?: string | null;
}

/** `GET /api/maintenance/occurrences?from&to` (MaintenanceSchedule.Scheduled). */
export interface MaintenanceOccurrence {
  windowId: string;
  name: string | null;
  targets: string[] | null;
  reason: string | null;
  start: string;
  end: string;
}

/** Item of `orbit.dependencies.json` (BE-30): `downstream` depends on `upstream` (monitor or group ids). */
export interface DependencyItem {
  id: string;
  upstream: string;
  downstream: string;
  note?: string | null;
}

/** `GET /api/incidents/{id}/escalation` (EscalationRunner.Upcoming); 204 = nothing pending. */
export interface EscalationStep {
  incidentId: string;
  policyName?: string | null;
  stepIndex?: number;
  stepName: string;
  dueAt: string;
  onCall?: string | null;
}

/** Item of `orbit.status-pages.json` (BE-42). */
export interface StatusPageRecord {
  id: string;
  slug: string;
  title?: string | null;
  pub?: boolean | null;
  groupIds?: string[] | null;
  monitorIds?: string[] | null;
}

/** `GET /api/audit` entry (io.orbit.security.audit.AuditEntry); `detail` is already masked. */
export interface AuditEntry {
  at: string;
  /** Client kind (`loopback`, `lan`, `unknown`); older entries may hold a self-declared name. */
  operator: string;
  action: string;
  target: string | null;
  detail: string | null;
  remoteAddress: string | null;
}

export interface AuditFilter {
  action?: string;
  target?: string;
  operator?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface AuditPage {
  items: AuditEntry[];
  /** Total matching entries when the backend reports it (BE-46 pagination), else null. */
  total: number | null;
}

/** `GET /api/connections/{id}/catalog` (BE-13 CatalogIntrospector.TableInfo). */
export interface CatalogTable {
  schema: string | null;
  name: string;
  columns: { name: string; type: string }[];
}

/** `GET /api/history/{monitorId}/summary` (io.orbit.history.HistorySummary). */
export interface HistorySummary {
  from: string;
  to: string;
  samples: number;
  down: number;
  uptimePercent: number | null;
  p50: number | null;
  p95: number | null;
  p99: number | null;
}

/** `GET /api/history/coverage`. */
export interface HistoryCoverageInfo {
  oldest: string | null;
  newest: string | null;
  retentionDays: number;
  rawWritesEnabled: boolean;
}

/** `POST /api/config/import?dryRun=` result (io.orbit.config.ConfigArchive.FileChange). */
export interface ConfigFileChange {
  file: string;
  added: string[];
  changed: string[];
  removed: string[];
}

/** `GET|PUT /api/settings` (io.orbit.security.settings.OrbitSettings). */
export interface OrbitSettingsRecord {
  id?: string;
  access?: { editFrom: string; cidrs: string[]; lanAcknowledge: boolean } | null;
  locale?: string | null;
  theme?: string | null;
  animationLevel?: string | null;
  historyHours?: number | null;
}

/** `GET /api/config/health` (assumed contract): one row per config file. */
export interface ConfigFileHealthRecord {
  file: string;
  state: 'ok' | 'missing' | 'invalid';
  items: number;
  error?: string;
}

/** `GET /api/monitors/{id}` (MonitorController.MonitorDetail); secrets in `definition` come back masked. */
export interface MonitorDetailRecord {
  definition: Record<string, unknown>;
  status: import('./types').MonitorView;
  lastResult: {
    state: string;
    latencyMs: number;
    conditions: { expression: string; level: string; passed: boolean; actual: unknown; message: string | null }[];
    error: string | null;
    checkedAt: string;
  } | null;
  uptime: { ratio: number; samples: number; coverageFrom: string | null } | null;
  latency: { p50: number | null; p95: number | null; p99: number | null; samples: number } | null;
  historySince: string | null;
}

/** `GET /api/query-catalog?connectionId=` (BE-12 `QueryCatalog.SavedQuery`, orbit.query-catalog.json). */
export interface SavedQuery {
  id: string;
  name: string;
  connectionId: string;
  sql: string;
  owner?: string | null;
  description?: string | null;
}

/** Body of `PUT /api/groups/{id}` (GroupController.GroupRequest). */
export interface GroupInput {
  id: string;
  name: string;
  color?: string | null;
  description?: string | null;
  order?: number;
}

/**
 * Body of `PUT /api/connections/{id}`. `password` is sealed into the vault and never returned; omit it on an
 * update to keep the stored one, or give `passwordEnv` (name of an environment variable) instead.
 */
export interface ConnectionInput {
  name: string;
  jdbcUrl: string;
  username: string;
  password?: string;
  passwordEnv?: string;
  poolSize?: number;
}

/** `POST /api/connections/{id}/test`. */
export interface ConnectionTestResult {
  ok: boolean;
  ms: number;
  error: string | null;
}

/** `POST /api/monitors/{id}/run`: the check result, values masked. */
export interface MonitorRunResult {
  state: string;
  latencyMs: number;
  error: string | null;
  checkedAt: string;
}

export type BulkMonitorAction = 'pause' | 'resume' | 'delete' | 'move';

/** `POST /api/monitors/bulk` answer: one result per id (`error`: `not-found` | `failed`). */
export interface BulkMonitorResult {
  action: BulkMonitorAction;
  results: { id: string; ok: boolean; error?: string | null }[];
}

/** `GET /api/silences` (orbit.silences.json): alerts of `target` (monitor or group id) are held until `until`. */
export interface SilenceRecord {
  id: string;
  target: string;
  reason: string;
  createdBy: string;
  createdAt: string;
  until: string;
}

/** `GET /api/incidents/{id}/postmortem` (BE-34). */
export interface PostmortemRecord {
  incidentId: string;
  monitorId: string;
  monitorName: string;
  groupId: string | null;
  status: string;
  severity: string;
  openedAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  timeToAcknowledgeSeconds: number | null;
  timeToResolveSeconds: number | null;
  ticket: string | null;
  timeline: IncidentEventRecord[];
}

/** `GET /api/events` (BE-52 history event log). */
export interface HistoryEventRecord {
  at: string;
  type: string;
  monitorId: string | null;
  actor: string | null;
  detail: string | null;
}
