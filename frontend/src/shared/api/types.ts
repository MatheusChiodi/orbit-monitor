/**
 * Contrato de dados entre o front e a API do Orbit (REST `/api`, WebSocket `/ws/wall`).
 * Datas trafegam como ISO-8601.
 */

export type Status = 'OK' | 'WARN' | 'DOWN';
export type Severity = Exclude<Status, 'OK'>;
export type MonitorType = 'HTTP' | 'SQL' | 'PING' | 'PUSH';

export type ComparisonOperator = '<' | '<=' | '>' | '>=' | '==' | '!=';

/** Regra principal de um monitor, mostrada na parede (`regra QTD < 200`). */
export interface Rule {
  field: string;
  operator: ComparisonOperator;
  limit: number;
}

export interface Group {
  id: string;
  name: string;
  color?: string;
}

export interface MonitorView {
  id: string;
  name: string;
  groupId: string;
  type: MonitorType;
  status: Status;
  /** Valor atual do campo principal (null = sem resposta). */
  value: number | null;
  unit?: string;
  rule?: Rule;
  /** Desde quando está no estado atual. */
  since: string;
  /** Últimos 60 pontos (1/min); null = sem resposta. */
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
  /** Disponibilidade 24 h em pontos percentuais (99.97). */
  uptime24h: number;
  lastRecoveryAt: string | null;
}

export type WallMessage =
  | { type: 'snapshot'; payload: WallSnapshot }
  | { type: 'monitor'; payload: MonitorView }
  | { type: 'incident'; payload: Incident }
  | { type: 'event'; payload: TimelineEvent };
