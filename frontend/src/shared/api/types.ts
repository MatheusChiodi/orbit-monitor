import type { FieldFormat } from '@/shared/format';
import type { DataClass } from '@/shared/privacy/redact';
import type { CheckTarget, HttpStep, OAuth2Auth } from './monitorTargets';

/**
 * Data contract between the frontend and the Orbit API (REST `/api`, WebSocket `/ws/wall`).
 * Dates travel as ISO-8601.
 */

export type Status = 'OK' | 'WARN' | 'DOWN';
export type Severity = Exclude<Status, 'OK'>;
export type MonitorType = 'HTTP' | 'SQL' | 'TCP' | 'PING' | 'PUSH' | 'DNS' | 'CERT' | 'GRPC' | 'KAFKA';

export type ComparisonOperator = '<' | '<=' | '>' | '>=' | '==' | '!=';

/** Main rule of a monitor, shown on the wall (`rule QTY < 200`). */
export interface Rule {
  field: string;
  operator: ComparisonOperator;
  limit: number;
}

export interface Group {
  id: string;
  name: string;
  color?: string;
  /** Present in `GET /api/groups`; a rename sends it back so the group keeps its place. */
  order?: number;
  description?: string | null;
}

export interface MonitorView {
  id: string;
  name: string;
  groupId: string;
  type: MonitorType;
  status: Status;
  /** Current value of the main field (null = no response). */
  value: number | null;
  unit?: string;
  rule?: Rule;
  /** Since when it has been in the current state. */
  since: string;
  /** Last 60 points (1/min); null = no response. */
  series?: (number | null)[];
}

export interface Incident {
  id: string;
  monitorId: string;
  severity: Severity;
  openedAt: string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  impact: string[];
  escalatesAt: string | null;
  /** FE-40 / BE-27: next escalation step (open, unacknowledged incidents only). */
  nextStep?: NextEscalationStep | null;
}

export interface NextEscalationStep {
  name: string;
  dueAt: string;
  /** Person on call for that step, when the step names a schedule. */
  onCall?: string | null;
}

/** BE-33: who is on call now, sent with the wall snapshot for the clock block. */
export interface WallOnCall {
  schedule: string;
  person: string;
  shiftEndsAt: string | null;
}

export type TimelineKind = 'DOWN' | 'WARN' | 'OK' | 'ACK' | 'INFO';

export interface TimelineEvent {
  id: string;
  at: string;
  kind: TimelineKind;
  title: string;
  detail: string;
}

export interface WallSnapshot {
  generatedAt: string;
  environment: string;
  groups: Group[];
  monitors: MonitorView[];
  incidents: Incident[];
  timeline: TimelineEvent[];
  /** 24 h availability in percentage points (99.97). */
  uptime24h: number;
  lastRecoveryAt: string | null;
  /** FE-17: produced by the incident simulator, never by the backend. */
  simulated?: boolean;
  /** FE-10: workspace name and logo (raw SVG, sanitized before display). */
  branding?: WorkspaceBranding;
  /** BE-33 on-call entries (absent on older backends: the wall then asks `/api/oncall/now`). */
  onCall?: WallOnCall[];
}

export interface WorkspaceBranding {
  name: string;
  logoSvg?: string;
}

/** `seq` increases per message (BE-38); clients resume with `?since=<seq>` after a reconnect. */
export type WallMessage = (
  | { type: 'snapshot'; payload: WallSnapshot }
  | { type: 'monitor'; payload: MonitorView }
  | { type: 'incident'; payload: Incident }
  | { type: 'event'; payload: TimelineEvent }
) & { seq?: number };

// ---------- Console ----------

/**
 * Orbit has no login. The network decides: mutations are accepted only from loopback by default,
 * other clients are view-only (they may still acknowledge incidents).
 */
export type AccessMode = 'edit' | 'view-only';

export interface AccessInfo {
  mode: AccessMode;
  client: 'loopback' | 'lan' | 'unknown';
}

export type ColumnType = 'number' | 'text' | 'date' | 'boolean';

export interface PreviewColumn {
  name: string;
  type: ColumnType;
}

export type PreviewRow = Record<string, string | number | boolean | null>;

export interface PreviewResult {
  columns: PreviewColumn[];
  rows: PreviewRow[];
  elapsedMs: number;
  /** HTTP status, when the monitor is HTTP. */
  status?: number;
  /** HTTP response body, already masked by the backend (FE-35 JSON explorer). */
  body?: string | null;
  /** BE-14 (SQL): the query is slow for the planned interval; `message` is in the request language. */
  cost?: { level: 'NONE' | 'WARN' | 'HEAVY'; suggestedIntervalSeconds: number; message: string } | null;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'HEAD';

export interface SqlTarget {
  type: 'SQL';
  connectionId: string;
  sql: string;
  /** Preview only (BE-14): the planned interval, for the cost warning. */
  intervalSeconds?: number;
}

export interface HttpTarget {
  type: 'HTTP';
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string;
  /** BE-08 client credentials; not sent with previews. */
  oauth?: OAuth2Auth;
  /** BE-07 steps that run before this request (login); not sent with previews. */
  steps?: HttpStep[];
}

export type PreviewRequest = SqlTarget | HttpTarget;

export type ConditionOperator = ComparisonOperator | 'between' | 'in' | 'older_than' | 'newer_than';

export interface Condition {
  field: string;
  operator: ConditionOperator;
  value: string;
  level: Severity;
}

export type DisplayMode =
  | 'number'
  | 'gauge'
  | 'indicators'
  | 'line'
  | 'bars'
  | 'table'
  | 'text'
  | 'semaphore'
  | 'hidden';

export interface FieldDisplay {
  field: string;
  selected: boolean;
  label: string;
  format: FieldFormat;
  unit?: string;
  decimals?: number;
  storeAsSeries: boolean;
  display: DisplayMode;
  /** Sensitive class detected by name or sample value (docs/04-data-protection.md). */
  dataClass?: DataClass | null;
  /** Always true for PCI fields; personal data is masked by default. */
  masked?: boolean;
  /** Personal and card data never go to the wall. */
  showOnWall?: boolean;
}

export interface MonitorDefinitionBase {
  id?: string;
  name: string;
  groupId: string;
  intervalSeconds: number;
  timeoutSeconds: number;
  retries: number;
  conditions: Condition[];
  fields: FieldDisplay[];
}

export type MonitorDefinition = MonitorDefinitionBase & (SqlTarget | HttpTarget | CheckTarget);

export type DatabaseKind = 'ORACLE' | 'POSTGRES' | 'SQLSERVER' | 'MYSQL';

export interface Connection {
  id: string;
  name: string;
  kind: DatabaseKind | 'UNKNOWN';
  /** Present in `GET /api/connections`; the password only ever comes back masked (`•••• (vault)`). */
  jdbcUrl?: string;
  username?: string | null;
  password?: string | null;
  poolSize?: number;
  updatedAt?: string;
  /** SQL monitors that read from this connection. */
  usedBy?: number;
}
