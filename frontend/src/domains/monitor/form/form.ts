import type {
  Condition,
  FieldDisplay,
  HttpMethod,
  MonitorDefinition,
  PreviewRequest,
  PreviewResult,
} from '@/shared/api/types';
import { msg, type Message } from '@/shared/i18n/message';
import type { EvaluationContext } from '../conditions';
import { checkSelect } from '../sql';

export interface MonitorFormState {
  name: string;
  groupId: string;
  type: 'SQL' | 'HTTP';
  intervalSeconds: number;
  timeoutSeconds: number;
  retries: number;
  connectionId: string;
  sql: string;
  method: HttpMethod;
  url: string;
  headersText: string;
  body: string;
  conditions: Condition[];
  fields: FieldDisplay[];
}

export function initialFormState(): MonitorFormState {
  return {
    name: '',
    groupId: '',
    type: 'SQL',
    intervalSeconds: 60,
    timeoutSeconds: 5,
    retries: 2,
    connectionId: '',
    sql: '',
    method: 'GET',
    url: '',
    headersText: '',
    body: '',
    conditions: [],
    fields: [],
  };
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

export function buildTarget(state: MonitorFormState): PreviewRequest {
  if (state.type === 'SQL') return { type: 'SQL', connectionId: state.connectionId, sql: state.sql };
  const target: PreviewRequest = {
    type: 'HTTP',
    method: state.method,
    url: state.url.trim(),
    headers: parseHeaders(state.headersText),
  };
  if (state.method !== 'GET' && state.method !== 'HEAD' && state.body.trim()) target.body = state.body;
  return target;
}

/** Errors that block the preview (target part only). */
export function validateTarget(state: MonitorFormState): Message[] {
  const errors: Message[] = [];
  if (state.type === 'SQL') {
    if (!state.connectionId) errors.push(msg('form.errors.connectionRequired'));
    const sqlError = checkSelect(state.sql);
    if (sqlError) errors.push(sqlError);
  } else if (!/^https?:\/\/\S+$/i.test(state.url.trim())) {
    errors.push(msg('form.errors.urlInvalid'));
  }
  return errors;
}

/** Errors that block saving the monitor. */
export function validateForm(state: MonitorFormState): Message[] {
  const errors: Message[] = [];
  if (!state.name.trim()) errors.push(msg('form.errors.nameRequired'));
  if (!state.groupId) errors.push(msg('form.errors.groupRequired'));
  errors.push(...validateTarget(state));
  if (state.intervalSeconds < 15 || state.intervalSeconds > 86_400) errors.push(msg('form.errors.intervalRange'));
  return errors;
}

export function buildDefinition(state: MonitorFormState): MonitorDefinition {
  return {
    name: state.name.trim(),
    groupId: state.groupId,
    intervalSeconds: state.intervalSeconds,
    timeoutSeconds: state.timeoutSeconds,
    retries: state.retries,
    conditions: state.conditions,
    fields: state.fields,
    ...buildTarget(state),
  };
}

/** Context used to test the conditions against the preview result. */
export function previewContext(preview: PreviewResult, now: Date = new Date()): EvaluationContext {
  return {
    row: preview.rows[0] ?? {},
    rowCount: preview.rows.length,
    elapsedMs: preview.elapsedMs,
    status: preview.status,
    now,
  };
}
