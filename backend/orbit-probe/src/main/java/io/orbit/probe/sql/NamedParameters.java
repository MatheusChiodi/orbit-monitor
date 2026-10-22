package io.orbit.probe.sql;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * BE-11: turns {@code :name} placeholders into JDBC {@code ?} markers and lists the values in order,
 * so values are always bound and never concatenated into the SQL. Placeholders inside string literals,
 * quoted identifiers and comments are left alone, and so is the PostgreSQL cast {@code ::type}.
 *
 * @param sql    the SQL with {@code ?} markers
 * @param values the value of each marker, in order
 */
record NamedParameters(String sql, List<Object> values) {

    static NamedParameters parse(String sql, Map<String, ?> params) {
        StringBuilder out = new StringBuilder(sql.length());
        List<Object> values = new ArrayList<>();
        int i = 0;
        int n = sql.length();
        while (i < n) {
            char c = sql.charAt(i);
            if (c == '\'' || c == '"' || c == '`') {
                int end = closingQuote(sql, i, c);
                out.append(sql, i, end);
                i = end;
            } else if (c == '-' && i + 1 < n && sql.charAt(i + 1) == '-') {
                int end = sql.indexOf('\n', i);
                end = end < 0 ? n : end;
                out.append(sql, i, end);
                i = end;
            } else if (c == '/' && i + 1 < n && sql.charAt(i + 1) == '*') {
                int end = sql.indexOf("*/", i + 2);
                end = end < 0 ? n : end + 2;
                out.append(sql, i, end);
                i = end;
            } else if (c == ':' && i + 1 < n && sql.charAt(i + 1) == ':') {
                out.append("::");
                i += 2;
            } else if (c == ':' && i + 1 < n && Character.isJavaIdentifierStart(sql.charAt(i + 1))) {
                int end = i + 1;
                while (end < n && Character.isJavaIdentifierPart(sql.charAt(end))) {
                    end++;
                }
                String name = sql.substring(i + 1, end);
                if (params == null || !params.containsKey(name)) {
                    throw new SqlProbeException("Missing value for parameter :" + name, false, null);
                }
                values.add(params.get(name));
                out.append('?');
                i = end;
            } else {
                out.append(c);
                i++;
            }
        }
        // Not List.copyOf: a null parameter is a legitimate SQL NULL.
        return new NamedParameters(out.toString(), Collections.unmodifiableList(values));
    }

    /** Index just after the closing quote; a doubled quote is an escaped quote. */
    private static int closingQuote(String sql, int start, char quote) {
        int i = start + 1;
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
