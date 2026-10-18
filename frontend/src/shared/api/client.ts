import type {
  Connection,
  Group,
  Incident,
  LoginRequest,
  MonitorDefinition,
  MonitorView,
  PreviewRequest,
  PreviewResult,
  Session,
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
  getToken?: () => string | null;
}

type HttpVerb = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RequestOptions {
  method?: HttpVerb;
  body?: unknown;
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `Falha na requisição (${response.status})`;
  try {
    const data: unknown = await response.json();
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
      return data.message;
    }
  } catch {
    // corpo sem JSON: usa a mensagem genérica
  }
  return fallback;
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? '';
  const doFetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init));

  async function request<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
    const headers = new Headers({ Accept: 'application/json' });
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    const token = options.getToken?.();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await doFetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
    });
    if (!response.ok) throw new ApiError(response.status, await readErrorMessage(response));
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  return {
    request,
    getWallSnapshot: () => request<WallSnapshot>('/api/wall/snapshot'),
    acknowledgeIncident: (id: string, by: string) =>
      request<Incident>(`/api/incidents/${encodeURIComponent(id)}/ack`, { method: 'POST', body: { by } }),
    login: (credentials: LoginRequest) => request<Session>('/api/auth/login', { method: 'POST', body: credentials }),
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
