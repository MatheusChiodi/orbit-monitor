export type SqlTokenKind = 'keyword' | 'identifier' | 'string' | 'number' | 'comment' | 'operator' | 'space';

export interface SqlToken {
  kind: SqlTokenKind;
  text: string;
}

export interface SqlCatalog {
  tables: { name: string; columns: string[] }[];
}

export interface SqlSuggestion {
  label: string;
  kind: 'table' | 'column';
}

const KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'AS', 'WITH', 'GROUP', 'BY', 'ORDER', 'HAVING', 'JOIN', 'LEFT', 'RIGHT',
  'INNER', 'OUTER', 'ON', 'IN', 'IS', 'NULL', 'BETWEEN', 'LIKE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'DISTINCT',
  'UNION', 'ALL', 'LIMIT', 'OFFSET', 'ASC', 'DESC', 'EXISTS', 'FETCH', 'FIRST', 'ROWS', 'ONLY',
]);

/** Clauses that start a new line when formatting. */
const CLAUSES = new Set(['FROM', 'WHERE', 'GROUP', 'ORDER', 'HAVING', 'UNION', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'LIMIT']);

const TOKEN = /(--[^\n]*)|(\/\*[\s\S]*?\*\/)|('(?:[^']|'')*')|(\s+)|(\d+(?:\.\d+)?)|([A-Za-z_][\w$#]*)|("(?:[^"])*")|(.)/g;

/** Splits a SELECT into tokens for highlighting; never executes or rewrites anything. */
export function tokenizeSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  for (const m of sql.matchAll(TOKEN)) {
    const text = m[0];
    if (m[1] || m[2]) tokens.push({ kind: 'comment', text });
    else if (m[3]) tokens.push({ kind: 'string', text });
    else if (m[4]) tokens.push({ kind: 'space', text });
    else if (m[5]) tokens.push({ kind: 'number', text });
    else if (m[6]) tokens.push({ kind: KEYWORDS.has(text.toUpperCase()) ? 'keyword' : 'identifier', text });
    else if (m[7]) tokens.push({ kind: 'identifier', text });
    else tokens.push({ kind: 'operator', text });
  }
  return tokens;
}

/** Upper-cases keywords and starts each main clause on its own line; literals stay untouched. */
export function formatSql(sql: string): string {
  const out: string[] = [];
  for (const token of tokenizeSql(sql.trim())) {
    if (token.kind === 'space') {
      out.push(token.text.includes('\n') ? '\n' : ' ');
      continue;
    }
    if (token.kind === 'keyword') {
      const word = token.text.toUpperCase();
      if (CLAUSES.has(word) && out.length > 0) {
        while (out.length && (out.at(-1) === ' ' || out.at(-1) === '\n')) out.pop();
        out.push('\n');
      }
      out.push(word);
      continue;
    }
    out.push(token.text);
  }
  return out.join('').replace(/ *\n */g, '\n').replace(/ {2,}/g, ' ');
}

/** Catalog suggestions for the word being typed: tables after FROM/JOIN, otherwise columns. */
export function suggest(sqlBeforeCursor: string, catalog: SqlCatalog): SqlSuggestion[] {
  const match = /([\w$#]*)$/.exec(sqlBeforeCursor);
  const prefix = (match?.[1] ?? '').toUpperCase();
  const before = sqlBeforeCursor.slice(0, sqlBeforeCursor.length - prefix.length).trimEnd();
  const previous = /([\w$#]+)$/.exec(before)?.[1]?.toUpperCase();
  const startsWith = (name: string) => name.toUpperCase().startsWith(prefix);
  if (previous === 'FROM' || previous === 'JOIN') {
    return catalog.tables.filter((t) => startsWith(t.name)).map((t) => ({ label: t.name, kind: 'table' }));
  }
  const columns = [...new Set(catalog.tables.flatMap((t) => t.columns))];
  return columns.filter(startsWith).map((c) => ({ label: c, kind: 'column' }));
}
