package io.orbit.monitor.sql;

/** Utilitários de texto SQL que não dependem de dialeto. */
final class SqlText {

    private SqlText() {
    }

    /**
     * Devolve só o "código" do SQL: literais ('...'), identificadores entre aspas ("...", `...`, [...])
     * e comentários (-- e /* *&#47;) viram espaço. Assim palavras dentro de textos não disparam
     * as verificações de palavras-chave e funções proibidas.
     */
    static String codeOnly(String sql) {
        StringBuilder out = new StringBuilder(sql.length());
        int i = 0;
        int n = sql.length();
        while (i < n) {
            char c = sql.charAt(i);
            if (c == '-' && i + 1 < n && sql.charAt(i + 1) == '-') {
                i = skipUntil(sql, i + 2, "\n");
            } else if (c == '/' && i + 1 < n && sql.charAt(i + 1) == '*') {
                i = skipUntil(sql, i + 2, "*/");
            } else if (c == '\'' || c == '"' || c == '`') {
                i = skipQuoted(sql, i + 1, c);
            } else if (c == '[') {
                i = skipUntil(sql, i + 1, "]");
            } else {
                out.append(c);
                i++;
                continue;
            }
            out.append(' ');
        }
        return out.toString();
    }

    /** Remove espaços e pontos e vírgulas finais. */
    static String stripTrailingSemicolons(String sql) {
        String s = sql.strip();
        while (s.endsWith(";")) {
            s = s.substring(0, s.length() - 1).strip();
        }
        return s;
    }

    private static int skipUntil(String sql, int from, String end) {
        int idx = sql.indexOf(end, from);
        return idx < 0 ? sql.length() : idx + end.length();
    }

    /** Pula um trecho entre aspas, tratando a aspa duplicada ('') como escape. */
    private static int skipQuoted(String sql, int from, char quote) {
        int i = from;
        while (i < sql.length()) {
            if (sql.charAt(i) == quote) {
                if (i + 1 < sql.length() && sql.charAt(i + 1) == quote) {
                    i += 2;
                    continue;
                }
                return i + 1;
            }
            i++;
        }
        return sql.length();
    }
}
