import type {
  Condition,
  FieldDisplay,
  HttpMethod,
  MonitorDefinition,
  PreviewRequest,
  PreviewResult,
} from '@/shared/api/types';
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

/** Uma linha por header, no formato `Nome: valor`. */
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

/** Erros que impedem o preview (só a parte do alvo). */
export function validateTarget(state: MonitorFormState): string[] {
  const errors: string[] = [];
  if (state.type === 'SQL') {
    if (!state.connectionId) errors.push('Escolha a conexão');
    const sqlError = checkSelect(state.sql);
    if (sqlError) errors.push(sqlError);
  } else if (!/^https?:\/\/\S+$/i.test(state.url.trim())) {
    errors.push('URL deve começar com http:// ou https://');
  }
  return errors;
}

/** Erros que impedem salvar o monitor. */
export function validateForm(state: MonitorFormState): string[] {
  const errors: string[] = [];
  if (!state.name.trim()) errors.push('Informe o nome');
  if (!state.groupId) errors.push('Escolha o grupo');
  errors.push(...validateTarget(state));
  if (state.intervalSeconds < 15 || state.intervalSeconds > 86_400) errors.push('Intervalo entre 15 s e 24 h');
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

/** Contexto para testar as condições contra o resultado do preview. */
export function previewContext(preview: PreviewResult, now: Date = new Date()): EvaluationContext {
  return {
    row: preview.rows[0] ?? {},
    rowCount: preview.rows.length,
    elapsedMs: preview.elapsedMs,
    status: preview.status,
    now,
  };
}
