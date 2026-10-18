import type {
  AccessInfo,
  Connection,
  Group,
  Incident,
  MonitorDefinition,
  MonitorView,
  PreviewRequest,
  PreviewResult,
  WallSnapshot,
} from './types';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface ApiClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
  /** Self-declared operator name, sent as `X-Orbit-Operator` (percent-encoded UTF-8). */
  getOperator?: () => string | null;
}

/** Header that carries the self-declared operator name (docs/01-architecture.md §3). */
export const OPERATOR_HEADER = 'X-Orbit-Operator';

type HttpVerb = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RequestOptions {
  method?: HttpVerb;
  body?: unknown;
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;
  try {
    const data: unknown = await response.json();
    if (data && typeof data === 'object') {
      if ('detail' in data && typeof data.detail === 'string') return data.detail;
      if ('message' in data && typeof data.message === 'string') return data.message;
    }
  } catch {
    // body without JSON: use the generic message
  }
  return fallback;
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? '';
  const doFetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init));

  async function request<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
    const headers = new Headers({ Accept: 'application/json' });
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    const operator = options.getOperator?.();
    if (operator) headers.set(OPERATOR_HEADER, encodeURIComponent(operator));

    const response = await doFetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
    if (!response.ok) throw new ApiError(response.status, await readErrorMessage(response));
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  return {
    request,
    getAccess: () => request<AccessInfo>('/api/access'),
    getWallSnapshot: () => request<WallSnapshot>('/api/wall/snapshot'),
    acknowledgeIncident: (id: string, by: string) =>
      request<Incident>(`/api/incidents/${encodeURIComponent(id)}/ack`, { method: 'POST', body: { by } }),
    listGroups: () => request<Group[]>('/api/groups'),
    listMonitors: () => request<MonitorView[]>('/api/monitors'),
    listConnections: () => request<Connection[]>('/api/connections'),
    createMonitor: (definition: MonitorDefinition) =>
      request<MonitorDefinition>('/api/monitors', { method: 'POST', body: definition }),
    previewMonitor: (target: PreviewRequest) =>
      request<PreviewResult>('/api/monitors/preview', { method: 'POST', body: target }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
