const FORBIDDEN = /\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|CALL|EXEC|EXECUTE)\b/i;
const BLOCKED_FUNCTIONS = /\b(DBMS_[A-Z0-9_]+|UTL_[A-Z0-9_]+|pg_sleep|xp_cmdshell)\b/i;

/** Remove literais e comentários para as checagens não confundirem texto com comando. */
function stripLiterals(sql: string): string {
  return sql
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/"(?:[^"])*"/g, '""')
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/**
 * Modo seguro no cliente (02-funcionalidades.md, 2.2): só SELECT/WITH, um comando,
 * sem DML/DDL e sem funções da lista negra. Devolve a mensagem de erro ou null.
 */
export function checkSelect(sql: string): string | null {
  if (sql.trim() === '') return 'Cole um SELECT';
  const code = stripLiterals(sql).trim().replace(/;\s*$/, '');
  if (code.includes(';')) return 'Apenas um comando por consulta';
  if (!/^(SELECT|WITH)\b/i.test(code)) return 'Somente SELECT ou WITH';
  const forbidden = FORBIDDEN.exec(code);
  if (forbidden) return `Comando não permitido: ${forbidden[1]!.toUpperCase()}`;
  const blocked = BLOCKED_FUNCTIONS.exec(code);
  if (blocked) return `Função bloqueada: ${blocked[1]}`;
  return null;
}
