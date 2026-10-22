import type { AccessInfo, Incident, WallSnapshot } from './types';

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
  /** UI language sent as `Accept-Language` (CORE-15: translated Problem Details). */
  getLocale?: () => string;
}

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

/**
 * HTTP core (headers, errors, JSON) plus the wall's own calls. The wall and the small feature
 * clients use it directly so the console endpoints never reach the wall bundle.
 */
export function createApiCore(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? '';
  const doFetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init));

  async function send(path: string, method: HttpVerb, body: BodyInit | undefined, contentType?: string): Promise<Response> {
    const headers = new Headers({ Accept: 'application/json' });
    if (contentType) headers.set('Content-Type', contentType);
    const locale = options.getLocale?.();
    if (locale) headers.set('Accept-Language', locale);

    const response = await doFetch(`${baseUrl}${path}`, { method, headers, body, cache: 'no-store' });
    if (!response.ok) throw new ApiError(response.status, await readErrorMessage(response));
    return response;
  }

  async function request<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
    const response = await send(
      path,
      method,
      body === undefined ? undefined : JSON.stringify(body),
      body === undefined ? undefined : 'application/json',
    );
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  /** Non-JSON bodies (config zip export/import). */
  const raw = (path: string, { method = 'GET', body, contentType }: { method?: HttpVerb; body?: Blob; contentType?: string } = {}) =>
    send(path, method, body, contentType);

  return {
    request,
    raw,
    getAccess: () => request<AccessInfo>('/api/access'),
    getWallSnapshot: () => request<WallSnapshot>('/api/wall/snapshot'),
    /** No name is sent: the server records the client kind (`loopback`, `lan`, `unknown`) as the actor. */
    acknowledgeIncident: (id: string) => request<Incident>(`/api/incidents/${encodeURIComponent(id)}/ack`, { method: 'POST' }),
  };
}

export type ApiCore = ReturnType<typeof createApiCore>;
