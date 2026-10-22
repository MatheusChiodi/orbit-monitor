import type { CheckTarget, DnsRecordType, HttpStep, HttpStepsTarget, OAuth2Auth } from '@/shared/api/monitorTargets';
import type { HttpMethod, HttpTarget, MonitorType, SqlTarget } from '@/shared/api/types';
import { msg, type Message } from '@/shared/i18n/message';

/** Draft of one multi-step HTTP step, as typed in the form. */
export interface StepDraft {
  name: string;
  method: HttpMethod;
  url: string;
  headersText: string;
  body: string;
  extractText: string;
}

export function emptyStep(): StepDraft {
  return { name: '', method: 'GET', url: '', headersText: '', body: '', extractText: '' };
}

/** Fields the form keeps for every kind besides SQL and plain HTTP. */
export interface KindFields {
  host: string;
  port: string;
  maxSilenceSeconds: number;
  recordType: DnsRecordType;
  expected: string;
  service: string;
  tls: boolean;
  bootstrapServers: string;
  consumerGroup: string;
  topic: string;
  steps: StepDraft[];
  auth: 'none' | 'oauth2';
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
}

export function initialKindFields(): KindFields {
  return {
    host: '',
    port: '',
    maxSilenceSeconds: 3600,
    recordType: 'A',
    expected: '',
    service: '',
    tls: false,
    bootstrapServers: '',
    consumerGroup: '',
    topic: '',
    steps: [emptyStep()],
    auth: 'none',
    tokenUrl: '',
    clientId: '',
    clientSecret: '',
    scope: '',
  };
}

export const MONITOR_KINDS = ['SQL', 'HTTP', 'HTTP_STEPS', 'TCP', 'PING', 'PUSH', 'DNS', 'CERT', 'GRPC', 'KAFKA'] as const satisfies readonly MonitorType[];
export type MonitorKind = (typeof MONITOR_KINDS)[number];
export const DNS_RECORD_TYPES: DnsRecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'];

const DEFAULT_PORT: Partial<Record<MonitorKind, number>> = { CERT: 443 };
const HTTP_URL = /^https?:\/\/\S+$/i;

export function isPreviewable(kind: MonitorKind): kind is 'SQL' | 'HTTP' {
  return kind === 'SQL' || kind === 'HTTP';
}

/** Placeholders the probe exposes to conditions when there is no preview (BE-01..BE-10). */
export function conditionFieldsFor(kind: MonitorKind): string[] {
  switch (kind) {
    case 'TCP':
    case 'PING':
      return ['[RESPONSE_TIME]', '[CONNECTED]'];
    case 'DNS':
      return ['[DNS_RCODE]', '[BODY]', '[RESPONSE_TIME]'];
    case 'CERT':
      return ['[CERTIFICATE_EXPIRATION]', '[DOMAIN_EXPIRATION]'];
    case 'GRPC':
      return ['[STATUS]', '[RESPONSE_TIME]'];
    case 'KAFKA':
      return ['[LAG]'];
    case 'HTTP_STEPS':
      return ['[STATUS]', '[RESPONSE_TIME]', '[BODY]'];
    case 'PUSH':
      return [];
    default:
      return [];
  }
}

/** One header per line, as `Name: value`. */
export function parseHeaders(text: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const index = line.indexOf(':');
    if (index <= 0) continue;
    const name = line.slice(0, index).trim();
    if (name) headers[name] = line.slice(index + 1).trim();
  }
  return headers;
}

/** `var = $.path` per line. */
export function parseExtract(text: string): Record<string, string> {
  const extract: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const match = /^\s*([A-Za-z_][\w]*)\s*=\s*(\$\S*)\s*$/.exec(line);
    if (match) extract[match[1]!] = match[2]!;
  }
  return extract;
}

function oauth(fields: KindFields): OAuth2Auth | undefined {
  if (fields.auth !== 'oauth2') return undefined;
  const auth: OAuth2Auth = { kind: 'oauth2', tokenUrl: fields.tokenUrl.trim(), clientId: fields.clientId.trim() };
  if (fields.clientSecret) auth.clientSecret = fields.clientSecret;
  if (fields.scope.trim()) auth.scope = fields.scope.trim();
  return auth;
}

function step(draft: StepDraft): HttpStep {
  const built: HttpStep = { name: draft.name.trim(), method: draft.method, url: draft.url.trim(), headers: parseHeaders(draft.headersText), extract: parseExtract(draft.extractText) };
  if (draft.method !== 'GET' && draft.method !== 'HEAD' && draft.body.trim()) built.body = draft.body;
  return built;
}

const optional = <K extends string>(key: K, value: string) => (value.trim() ? { [key]: value.trim() } : {}) as Partial<Record<K, string>>;

export interface TargetSource extends KindFields {
  type: MonitorKind;
  connectionId: string;
  sql: string;
  method: HttpMethod;
  url: string;
  headersText: string;
  body: string;
}

export function buildMonitorTarget(state: TargetSource): SqlTarget | HttpTarget | HttpStepsTarget | CheckTarget {
  const port = state.port.trim() ? Number(state.port) : DEFAULT_PORT[state.type];
  switch (state.type) {
    case 'SQL':
      return { type: 'SQL', connectionId: state.connectionId, sql: state.sql };
    case 'HTTP': {
      const target: HttpTarget = { type: 'HTTP', method: state.method, url: state.url.trim(), headers: parseHeaders(state.headersText) };
      if (state.method !== 'GET' && state.method !== 'HEAD' && state.body.trim()) target.body = state.body;
      const auth = oauth(state);
      if (auth) target.auth = auth;
      return target;
    }
    case 'HTTP_STEPS': {
      const auth = oauth(state);
      return { type: 'HTTP_STEPS', steps: state.steps.map(step), ...(auth ? { auth } : {}) };
    }
    case 'PING':
      return { type: 'PING', host: state.host.trim() };
    case 'PUSH':
      return { type: 'PUSH', maxSilenceSeconds: state.maxSilenceSeconds };
    case 'DNS':
      return { type: 'DNS', host: state.host.trim(), recordType: state.recordType, ...optional('expected', state.expected) };
    case 'GRPC':
      return { type: 'GRPC', host: state.host.trim(), ...(port ? { port } : {}), ...optional('service', state.service), tls: state.tls };
    case 'KAFKA':
      return { type: 'KAFKA', bootstrapServers: state.bootstrapServers.trim(), consumerGroup: state.consumerGroup.trim(), ...optional('topic', state.topic) };
    case 'TCP':
    case 'CERT':
      return { type: state.type, host: state.host.trim(), ...(port ? { port } : {}) };
  }
}

/** Errors for the kinds validated here (SQL and plain HTTP URL are checked in `validateTarget`). */
export function validateKind(state: TargetSource): Message[] {
  const errors: Message[] = [];
  const needsHost = ['TCP', 'PING', 'DNS', 'CERT', 'GRPC'].includes(state.type);
  if (needsHost && !state.host.trim()) errors.push(msg('monitorForm.errors.hostRequired'));
  if (['TCP', 'CERT', 'GRPC'].includes(state.type) && state.port.trim()) {
    const port = Number(state.port);
    if (!Number.isInteger(port) || port < 1 || port > 65_535) errors.push(msg('monitorForm.errors.portRange'));
  }
  if (state.type === 'TCP' && !state.port.trim()) errors.push(msg('monitorForm.errors.portRange'));
  if (state.type === 'PUSH' && (state.maxSilenceSeconds < 60 || state.maxSilenceSeconds > 7 * 86_400)) {
    errors.push(msg('monitorForm.errors.silenceRange'));
  }
  if (state.type === 'KAFKA' && (!state.bootstrapServers.trim() || !state.consumerGroup.trim())) {
    errors.push(msg('monitorForm.errors.kafkaRequired'));
  }
  if (state.type === 'HTTP_STEPS' && (state.steps.length === 0 || state.steps.some((s) => !s.name.trim() || !HTTP_URL.test(s.url.trim())))) {
    errors.push(msg('monitorForm.errors.stepInvalid'));
  }
  if ((state.type === 'HTTP' || state.type === 'HTTP_STEPS') && state.auth === 'oauth2') {
    if (!HTTP_URL.test(state.tokenUrl.trim()) || !state.clientId.trim()) errors.push(msg('monitorForm.errors.oauthRequired'));
  }
  return errors;
}
