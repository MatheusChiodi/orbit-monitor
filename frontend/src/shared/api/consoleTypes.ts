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
  | 'REOPENED';

export interface IncidentEventRecord {
  type: IncidentEventType;
  /** Self-declared operator name, or `orbit` for system events. */
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
  duration?: string | number | null;
  zone?: string | null;
  reason?: string | null;
}

/** Item of `orbit.dependencies.json` (BE-30): `downstream` depends on `upstream` (monitor or group ids). */
export interface DependencyItem {
  id: string;
  upstream: string;
  downstream: string;
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
