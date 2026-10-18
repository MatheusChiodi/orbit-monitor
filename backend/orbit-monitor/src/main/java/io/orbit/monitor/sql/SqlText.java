package io.orbit.monitor.sql;

/** Dialect-independent SQL text helpers. */
final class SqlText {

    private SqlText() {
    }

    /**
     * Returns only the SQL "code": literals ('...'), quoted identifiers ("...", `...`, [...])
     * and comments (-- and /* *&#47;) become a space, so words inside text never trigger
     * the forbidden keyword and function checks.
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

    /** Strips trailing whitespace and semicolons. */
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

    /** Skips a quoted section, treating a doubled quote ('') as an escape. */
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
