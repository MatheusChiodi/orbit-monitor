import type { HttpMethod } from './types';

/**
 * Monitor kinds beyond SQL/HTTP (BE-01..BE-10). The body of `POST /api/monitors` is flat
 * (`io.orbit.api.web.MonitorRequest`): TCP/PING/PUSH use `host`, `port`, `maxSilenceSeconds` today;
 * the other fields follow the probes' context files and are the contract assumed for be-runtime.
 */
export type CheckKind = 'TCP' | 'PING' | 'PUSH' | 'DNS' | 'CERT' | 'GRPC' | 'KAFKA';

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS';

export interface CheckTarget {
  type: CheckKind;
  host?: string;
  port?: number;
  /** PUSH: silence longer than this is DOWN. */
  maxSilenceSeconds?: number;
  /** DNS (BE-04). */
  recordType?: DnsRecordType;
  expected?: string;
  /** gRPC health service name (BE-09); empty = server health. */
  service?: string;
  tls?: boolean;
  /** Kafka consumer lag (BE-10). */
  bootstrapServers?: string;
  consumerGroup?: string;
  topic?: string;
}

/** OAuth2 client credentials (BE-08); the secret goes to the vault and is never read back. */
export interface OAuth2Auth {
  kind: 'oauth2';
  tokenUrl: string;
  clientId: string;
  /** Typed once; omitted on update to keep the sealed secret. */
  clientSecret?: string;
  scope?: string;
}

/** One step of a multi-step HTTP monitor (BE-07); `extract` maps variable → JSONPath, used later as `${step.var}`. */
export interface HttpStep {
  name: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string;
  extract: Record<string, string>;
}

export interface HttpStepsTarget {
  type: 'HTTP_STEPS';
  steps: HttpStep[];
  auth?: OAuth2Auth;
}

/** `POST /api/monitors` response (MonitorController.MonitorDetail); `pushUrl` only when a push monitor is created. */
export interface MonitorSaveResult {
  pushUrl?: string;
}
