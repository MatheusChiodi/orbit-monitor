import type { HttpMethod } from './types';

/**
 * Monitor kinds beyond SQL/HTTP (BE-01..BE-10), as `POST /api/monitors` takes them
 * (`io.orbit.api.web.MonitorRequest`): `host`, `port`, `maxSilenceSeconds` and a `probe` object.
 */
export type CheckKind = 'TCP' | 'PING' | 'PUSH' | 'DNS' | 'CERT' | 'GRPC' | 'KAFKA';

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS';

/** Settings of the newer check kinds (`CheckMonitorDef.Probe`); only the kind's own fields are sent. */
export interface CheckProbe {
  recordType?: DnsRecordType;
  expected?: string;
  service?: string;
  tls?: boolean;
  bootstrapServers?: string;
  consumerGroup?: string;
  topic?: string;
  /** CERT: domain whose registration expiry is read over RDAP. */
  domain?: string;
}

export interface CheckTarget {
  type: CheckKind;
  host?: string;
  port?: number;
  /** PUSH: silence longer than this is DOWN. */
  maxSilenceSeconds?: number;
  probe?: CheckProbe;
}

/** OAuth2 client credentials (BE-08, `MonitorRequest.OAuthRequest`); the secret is sealed and never read back. */
export interface OAuth2Auth {
  tokenUrl: string;
  clientId: string;
  /** Typed once; omitted on update to keep the sealed secret. */
  clientSecret?: string;
  scope?: string;
}

/** A step that runs before the main request (BE-07); `extract` maps variable → JSONPath, used as `${step.var}`. */
export interface HttpStep {
  name: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string;
  extract: Record<string, string>;
}

/** `POST /api/monitors` response (MonitorController.MonitorDetail); `pushUrl` only when a push monitor is created. */
export interface MonitorSaveResult {
  pushUrl?: string;
}
