import type { ConnectionInput, ConnectionTestResult } from '@/shared/api/consoleTypes';
import type { Connection, DatabaseKind } from '@/shared/api/types';
import { msg, type Message } from '@/shared/i18n/message';

/** What the connection screens need from the console source (live API or demo). */
export interface ConnectionsSource {
  listConnections: () => Promise<Connection[]>;
  saveConnection: (id: string, connection: ConnectionInput) => Promise<Connection>;
  /** `force` pauses the SQL monitors that use it and deletes anyway. */
  deleteConnection: (id: string, force?: boolean) => Promise<void>;
  testConnection: (id: string) => Promise<ConnectionTestResult>;
  /** Tests typed settings without saving (with `id`, an empty password uses the stored one). */
  testConnectionDraft?: (draft: ConnectionInput & { id?: string }) => Promise<ConnectionTestResult>;
}

/** Same key as the monitor form's connection list, so a new connection shows up there at once. */
export function connectionsKey(demo: boolean) {
  return ['connections', demo] as const;
}

export const DATABASE_KINDS: readonly DatabaseKind[] = ['POSTGRES', 'MYSQL', 'SQLSERVER', 'ORACLE'];

export const JDBC_EXAMPLES: Record<DatabaseKind, string> = {
  POSTGRES: 'jdbc:postgresql://db.internal:5432/orders',
  MYSQL: 'jdbc:mysql://db.internal:3306/orders',
  SQLSERVER: 'jdbc:sqlserver://db.internal:1433;databaseName=orders',
  ORACLE: 'jdbc:oracle:thin:@//db.internal:1521/ORCL',
};

/** Kind guessed from the URL, the same way the server does (`Dialect.fromJdbcUrl`). */
export function kindOfJdbcUrl(url: string): DatabaseKind | null {
  const match = /^jdbc:(postgresql|mysql|mariadb|sqlserver|oracle):/i.exec(url.trim());
  if (!match) return null;
  const name = match[1]!.toLowerCase();
  if (name === 'postgresql') return 'POSTGRES';
  if (name === 'mysql' || name === 'mariadb') return 'MYSQL';
  if (name === 'sqlserver') return 'SQLSERVER';
  return 'ORACLE';
}

/** `Orders DB` → `orders-db`, plus a suffix when the id is taken (ids are file keys, never shown). */
export function newId(name: string, taken: readonly string[] = []): string {
  const base =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'item';
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export interface ConnectionDraft {
  name: string;
  jdbcUrl: string;
  username: string;
  /** Typed password; empty keeps the stored one on edit. Never read back from the API. */
  password: string;
  useEnv: boolean;
  passwordEnv: string;
}

export function emptyDraft(connection?: Connection): ConnectionDraft {
  return {
    name: connection?.name ?? '',
    jdbcUrl: connection?.jdbcUrl ?? '',
    username: connection?.username ?? '',
    password: '',
    useEnv: false,
    passwordEnv: '',
  };
}

export type DraftErrors = Partial<Record<'name' | 'jdbcUrl' | 'username' | 'password', Message>>;

/** `stored`: the connection already has a password in the vault, so it may stay empty. */
export function validateDraft(draft: ConnectionDraft, stored: boolean): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.name.trim()) errors.name = msg('monitorForm.connections.errors.nameRequired');
  if (!/^jdbc:\w+:/i.test(draft.jdbcUrl.trim())) errors.jdbcUrl = msg('monitorForm.connections.errors.jdbcInvalid');
  if (!draft.username.trim()) errors.username = msg('monitorForm.connections.errors.usernameRequired');
  const hasSecret = draft.useEnv ? draft.passwordEnv.trim() !== '' : draft.password !== '' || stored;
  if (!hasSecret) errors.password = msg('monitorForm.connections.errors.passwordRequired');
  return errors;
}

export function toInput(draft: ConnectionDraft): ConnectionInput {
  const input: ConnectionInput = { name: draft.name.trim(), jdbcUrl: draft.jdbcUrl.trim(), username: draft.username.trim() };
  if (draft.useEnv) input.passwordEnv = draft.passwordEnv.trim();
  else if (draft.password) input.password = draft.password;
  return input;
}
