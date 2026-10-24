import { ApiError, createApiCore, type ApiClientOptions } from '@/shared/api/client';

/** `var`: plain value · `vault`: sealed secret or `${env:NAME}` reference (the API only returns it masked). */
export type VariableKind = 'var' | 'vault';

export interface Variable {
  id: string;
  name: string;
  kind: VariableKind;
  /** Plain value, or the masked secret for vault variables. */
  value: string;
  description: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface VariableInput {
  name: string;
  kind: VariableKind;
  /** For vault variables, `null` keeps the current secret. */
  value: string | null;
  description: string;
}

export interface VariablesApi {
  list: () => Promise<Variable[]>;
  /** `id` null creates (`POST`); otherwise updates (`PUT`). */
  save: (id: string | null, input: VariableInput) => Promise<Variable>;
  remove: (id: string) => Promise<void>;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown) => (typeof v === 'string' ? v : '');

export const VARIABLE_NAME = /^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/;

function normalize(raw: unknown): Variable | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  const kind: VariableKind = raw.kind === 'vault' ? 'vault' : 'var';
  const variable: Variable = { id: raw.id, name: raw.name, kind, value: text(raw.value), description: text(raw.description) };
  if (typeof raw.updatedAt === 'string') variable.updatedAt = raw.updatedAt;
  if (typeof raw.updatedBy === 'string') variable.updatedBy = raw.updatedBy;
  return variable;
}

function items(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  return isRecord(payload) && Array.isArray(payload.items) ? payload.items : [];
}

/** `GET/POST/PUT/DELETE /api/variables` (`orbit.variables.json`); secrets are sealed by the backend. */
export function createVariablesApi(options: ApiClientOptions = {}): VariablesApi {
  const { request } = createApiCore(options);
  return {
    async list() {
      try {
        return items(await request<unknown>('/api/variables')).flatMap((raw) => normalize(raw) ?? []);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return [];
        throw error;
      }
    },
    async save(id, input) {
      const body = { id: id ?? undefined, name: input.name, kind: input.kind.toUpperCase(), value: input.value, description: input.description };
      const saved = id
        ? await request<unknown>(`/api/variables/${encodeURIComponent(id)}`, { method: 'PUT', body })
        : await request<unknown>('/api/variables', { method: 'POST', body });
      return normalize(saved) ?? { id: id ?? `var_${input.name}`, ...input, value: input.value ?? '' };
    },
    remove: (id) => request<void>(`/api/variables/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  };
}

const MASKED = '•••• (vault)';

/** Demo mode never calls the API: variables live in memory for the session. */
export function createDemoVariablesApi(): VariablesApi {
  let store: Variable[] = [{ id: 'var_region', name: 'region', kind: 'var', value: 'sa-east-1', description: 'Default cloud region' }];
  return {
    list: async () => store.map((v) => ({ ...v })),
    async save(id, input) {
      const next: Variable = {
        id: id ?? `var_${input.name}`,
        name: input.name,
        kind: input.kind,
        value: input.kind === 'vault' ? MASKED : (input.value ?? ''),
        description: input.description,
      };
      store = [...store.filter((v) => v.id !== next.id), next];
      return next;
    },
    async remove(id) {
      store = store.filter((v) => v.id !== id);
    },
  };
}

/** `POST /api/workspace/reset`: workspace defaults, customization and terminology go back to the built-in values. */
export async function workspaceReset(options: ApiClientOptions = {}): Promise<string[]> {
  const { request } = createApiCore(options);
  const result = await request<unknown>('/api/workspace/reset', { method: 'POST' });
  return isRecord(result) && Array.isArray(result.reset) ? result.reset.filter((x): x is string => typeof x === 'string') : [];
}
