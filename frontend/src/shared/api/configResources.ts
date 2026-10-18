import { ApiError, createApiClient, type ApiClientOptions } from './client';

/**
 * Configuration lives in one `orbit.<feature>.json` per feature, managed by the backend
 * (docs/06-configuration-files.md). The console only reads and writes it through the API
 * and never keeps a copy in the browser.
 */
export const CONFIG_RESOURCES = [
  'settings',
  'connections',
  'requests',
  'selects',
  'query-catalog',
  'checks',
  'groups',
  'dependencies',
  'layouts',
  'themes',
  'channels',
  'escalation',
  'oncall',
  'maintenance',
  'silences',
  'notification-templates',
  'variables',
  'status-pages',
] as const;

export type ConfigResource = (typeof CONFIG_RESOURCES)[number];

export interface ConfigItem {
  id: string;
  [key: string]: unknown;
}

/** Same shape as the file on disk: `{ version, items }`. */
export interface ConfigFile<T extends ConfigItem = ConfigItem> {
  version: number;
  items: T[];
}

/** A file that does not exist yet means "nothing registered". */
export function emptyConfigFile<T extends ConfigItem = ConfigItem>(): ConfigFile<T> {
  return { version: 1, items: [] };
}

export interface VaultMarker {
  vault: true;
}

/** Encrypted secrets (`{ enc: "v1:…" }`) are replaced by a marker so ciphertext never reaches the UI. */
function scrubSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubSecrets);
  if (value && typeof value === 'object') {
    if ('enc' in value) return { vault: true } satisfies VaultMarker;
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrubSecrets(v)]));
  }
  return value;
}

export function createConfigClient(options: ApiClientOptions = {}) {
  const { request } = createApiClient(options);
  const path = (resource: ConfigResource, id?: string) =>
    id === undefined ? `/api/${resource}` : `/api/${resource}/${encodeURIComponent(id)}`;

  return {
    async list<T extends ConfigItem = ConfigItem>(resource: ConfigResource): Promise<ConfigFile<T>> {
      try {
        const file = await request<ConfigFile<T>>(path(resource));
        return scrubSecrets(file) as ConfigFile<T>;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return emptyConfigFile<T>();
        throw error;
      }
    },
    create: <T extends ConfigItem>(resource: ConfigResource, item: Omit<T, 'id'> & Partial<Pick<T, 'id'>>) =>
      request<T>(path(resource), { method: 'POST', body: item }),
    update: <T extends ConfigItem>(resource: ConfigResource, id: string, item: Partial<T>) =>
      request<T>(path(resource, id), { method: 'PUT', body: item }),
    remove: (resource: ConfigResource, id: string) => request<void>(path(resource, id), { method: 'DELETE' }),
  };
}

export type ConfigClient = ReturnType<typeof createConfigClient>;
