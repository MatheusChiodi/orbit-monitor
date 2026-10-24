import type { DnsRecordType } from '@/shared/api/monitorTargets';
import type { Condition, FieldDisplay, HttpMethod, MonitorDefinition, Severity } from '@/shared/api/types';
import type { FieldFormat } from '@/shared/format';
import { detectSensitive } from '@/shared/privacy/redact';
import { parseExpression } from '../conditions/alertRules';
import { initialFormState, type MonitorFormState } from './form';
import { emptyStep, type StepDraft } from './targets';

/** A saved condition the visual editor cannot show; it is kept and saved back as written. */
export interface KeptCondition {
  expression: string;
  level: Severity;
}

export interface LoadedMonitor {
  state: MonitorFormState;
  /** Saved settings the form does not edit (pause, hysteresis, window…); sent back unchanged on save. */
  extras: Record<string, unknown>;
  keptConditions: KeptCondition[];
}

const EXTRA_KEYS = ['id', 'paused', 'hysteresis', 'openOnWarn', 'window', 'retry', 'parameters', 'maxRows', 'followRedirects'];

type Json = Record<string, unknown>;
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {});
const list = (v: unknown): Json[] => (Array.isArray(v) ? v.map(obj) : []);

/** Secrets come back masked (`•••• (vault)`); sending the mask back keeps the stored one. */
export function isMasked(value: string): boolean {
  return value.includes('••••');
}

function headerLines(...maps: unknown[]): string {
  return maps
    .flatMap((m) => Object.entries(obj(m)))
    .map(([name, value]) => `${name}: ${str(value)}`)
    .join('\n');
}

function stepDraft(step: Json): StepDraft {
  const extract = Object.entries(obj(step.extract)).map(([name, path]) => `${name} = ${str(path)}`);
  return {
    name: str(step.name),
    method: str(step.method, 'GET') as HttpMethod,
    url: str(step.url),
    headersText: headerLines(step.headers),
    body: str(step.body),
    extractText: extract.join('\n'),
  };
}

function field(saved: Json): FieldDisplay {
  const key = str(saved.key ?? saved.field);
  return {
    field: key,
    selected: true,
    label: str(saved.label, key),
    format: str(saved.format, 'text') as FieldFormat,
    ...(typeof saved.unit === 'string' ? { unit: saved.unit } : {}),
    ...(typeof saved.decimals === 'number' ? { decimals: saved.decimals } : {}),
    storeAsSeries: saved.series === true || saved.storeAsSeries === true,
    display: str(saved.display, 'number') as FieldDisplay['display'],
    dataClass: detectSensitive(undefined, key),
    masked: saved.masked === true,
    showOnWall: saved.showOnWall !== false,
  };
}

/** `GET /api/monitors/{id}` → the form in edit mode (secrets stay masked; an empty secret keeps the stored one). */
export function stateFromDefinition(definition: Json): LoadedMonitor {
  const base = initialFormState();
  const type = str(definition.type, 'HTTP').toUpperCase();
  const steps = list(definition.steps);
  const oauth = obj(definition.oauth);
  const probe = obj(definition.probe);
  const kept: KeptCondition[] = [];
  const conditions: Condition[] = [];
  for (const saved of list(definition.conditions)) {
    const level = (str(saved.level, 'DOWN').toUpperCase() === 'WARN' ? 'WARN' : 'DOWN') as Severity;
    const expression = str(saved.expression);
    const parsed = parseExpression(expression, level);
    if (parsed) conditions.push(parsed);
    else if (expression) kept.push({ expression, level });
  }
  const main: StepDraft = {
    ...emptyStep(),
    name: 'main',
    method: str(definition.method, 'GET') as HttpMethod,
    url: str(definition.url),
    headersText: headerLines(definition.headers, definition.secretHeaders),
    body: str(definition.body),
  };
  const state: MonitorFormState = {
    ...base,
    type: type === 'HTTP' && steps.length > 0 ? 'HTTP_STEPS' : (type as MonitorFormState['type']),
    name: str(definition.name),
    groupId: str(definition.groupId),
    intervalSeconds: num(definition.intervalSeconds, base.intervalSeconds),
    timeoutSeconds: Math.max(1, Math.round(num(definition.timeoutMs, base.timeoutSeconds * 1000) / 1000)),
    retries: num(definition.downAfter ?? definition.retries, base.retries),
    connectionId: str(definition.connectionId),
    sql: str(definition.sql),
    method: main.method,
    url: main.url,
    headersText: main.headersText,
    body: main.body,
    conditions,
    fields: list(definition.fields).map(field),
    host: str(definition.host),
    port: typeof definition.port === 'number' ? String(definition.port) : '',
    maxSilenceSeconds: num(definition.maxSilenceSeconds, base.maxSilenceSeconds),
    recordType: str(probe.recordType, base.recordType) as DnsRecordType,
    expected: str(probe.expected),
    service: str(probe.service),
    tls: probe.tls === true,
    bootstrapServers: str(probe.bootstrapServers),
    consumerGroup: str(probe.consumerGroup),
    topic: str(probe.topic),
    steps: steps.length > 0 ? [...steps.map(stepDraft), main] : base.steps,
    auth: oauth.tokenUrl ? 'oauth2' : 'none',
    tokenUrl: str(oauth.tokenUrl),
    clientId: str(oauth.clientId),
    clientSecret: '',
    scope: str(oauth.scope),
  };
  const extras = Object.fromEntries(EXTRA_KEYS.filter((k) => definition[k] !== undefined && definition[k] !== null).map((k) => [k, definition[k]]));
  return { state, extras, keptConditions: kept };
}

/** Duplicate: a new monitor (no id) named "Copy of …"; masked secrets are dropped and must be typed again. */
export function duplicateOf(loaded: LoadedMonitor, name: string): LoadedMonitor {
  const { id: _id, paused: _paused, ...extras } = loaded.extras;
  const dropMasked = (text: string) =>
    text
      .split('\n')
      .filter((line) => !isMasked(line))
      .join('\n');
  return {
    state: {
      ...loaded.state,
      name,
      headersText: dropMasked(loaded.state.headersText),
      steps: loaded.state.steps.map((s) => ({ ...s, headersText: dropMasked(s.headersText) })),
    },
    extras,
    keptConditions: loaded.keptConditions,
  };
}

/** FE-32 template → a new monitor's form. */
export function stateFromTemplate(definition: MonitorDefinition): MonitorFormState {
  const base = initialFormState();
  const state: MonitorFormState = {
    ...base,
    type: definition.type,
    name: definition.name,
    intervalSeconds: definition.intervalSeconds,
    timeoutSeconds: definition.timeoutSeconds,
    retries: definition.retries,
    conditions: definition.conditions.map((c) => ({ ...c })),
  };
  if (definition.type === 'HTTP') {
    return { ...state, method: definition.method, url: definition.url, headersText: headerLines(definition.headers), body: definition.body ?? '' };
  }
  if (definition.type === 'SQL') return { ...state, sql: definition.sql };
  return state;
}
