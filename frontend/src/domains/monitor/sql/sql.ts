import { msg, type Message } from '@/shared/i18n/message';

const FORBIDDEN = /\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|CALL|EXEC|EXECUTE)\b/i;
const BLOCKED_FUNCTIONS = /\b(DBMS_[A-Z0-9_]+|UTL_[A-Z0-9_]+|pg_sleep|xp_cmdshell)\b/i;

/** Strips literals and comments so the checks do not mistake text for a statement. */
function stripLiterals(sql: string): string {
  return sql
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/"(?:[^"])*"/g, '""')
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/**
 * Client-side safe mode (docs/02-features.md, 2.2): SELECT/WITH only, a single statement,
 * no DML/DDL and no blocklisted functions. Returns the error message or null.
 * The backend validates again; this only gives instant feedback.
 */
export function checkSelect(sql: string): Message | null {
  if (sql.trim() === '') return msg('sql.errors.empty');
  const code = stripLiterals(sql).trim().replace(/;\s*$/, '');
  if (code.includes(';')) return msg('sql.errors.multiple');
  if (!/^(SELECT|WITH)\b/i.test(code)) return msg('sql.errors.notSelect');
  const forbidden = FORBIDDEN.exec(code);
  if (forbidden) return msg('sql.errors.forbidden', { word: forbidden[1]!.toUpperCase() });
  const blocked = BLOCKED_FUNCTIONS.exec(code);
  if (blocked) return msg('sql.errors.blocked', { name: blocked[1]! });
  return null;
}
