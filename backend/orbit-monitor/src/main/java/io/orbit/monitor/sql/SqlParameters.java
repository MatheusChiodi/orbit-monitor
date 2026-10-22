package io.orbit.monitor.sql;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.temporal.Temporal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * BE-11: named parameters ({@code :days}, {@code :store}) in a SELECT. They are always bound with
 * {@code PreparedStatement.setObject}, never concatenated into the SQL text.
 * <p>
 * The scanner skips string literals ({@code '...'} with {@code ''} escapes), quoted identifiers
 * ({@code "..."}, {@code `...`}, {@code [...]}), comments ({@code --}, {@code /* *&#47;}) and
 * PostgreSQL casts ({@code ::int}), the same sections {@link SqlText#codeOnly} treats as non-code.
 */
public final class SqlParameters {

    /** SQL with {@code ?} placeholders and the values in binding order. */
    public record Bound(String sql, List<Object> values) {

        public Bound {
            values = Collections.unmodifiableList(new ArrayList<>(values));
        }
    }

    /** Receives code, skipped (literal/comment) text and parameters while the SQL is scanned. */
    private interface Visitor {
        void code(String sql, int from, int to);

        void parameter(String name);
    }

    private SqlParameters() {
    }

    /** Parameter names in order of first appearance; text inside literals and comments is ignored. */
    public static List<String> names(String sql) {
        LinkedHashSet<String> names = new LinkedHashSet<>();
        scan(sql, new Visitor() {
            @Override
            public void code(String s, int from, int to) {
                // only the names matter here
            }

            @Override
            public void parameter(String name) {
                names.add(name);
            }
        });
        return List.copyOf(names);
    }

    /** Replaces each {@code :name} by {@code ?}; a missing value is an {@link UnsafeSqlException}. */
    public static Bound bind(String sql, Map<String, ?> values) {
        StringBuilder out = new StringBuilder(sql == null ? 0 : sql.length());
        List<Object> bound = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        scan(sql, new Visitor() {
            @Override
            public void code(String s, int from, int to) {
                out.append(s, from, to);
            }

            @Override
            public void parameter(String name) {
                out.append('?');
                if (values == null || !values.containsKey(name)) {
                    if (!missing.contains(name)) {
                        missing.add(name);
                    }
                    return;
                }
                Object value = values.get(name);
                requireScalar(name, value);
                bound.add(value);
            }
        });
        if (!missing.isEmpty()) {
            String list = String.join(", ", missing.stream().map(n -> ":" + n).toList());
            throw new UnsafeSqlException("missing-parameter", "Missing value for parameter " + list, list);
        }
        return new Bound(out.toString(), bound);
    }

    /** Only single values are bound: lists, maps and arrays could change the shape of the query. */
    private static void requireScalar(String name, Object value) {
        boolean scalar = switch (value) {
            case null -> true;
            case String s -> true;
            case Integer i -> true;
            case Long l -> true;
            case Short s -> true;
            case Byte b -> true;
            case Double d -> true;
            case Float f -> true;
            case BigDecimal b -> true;
            case BigInteger b -> true;
            case Boolean b -> true;
            case Character c -> true;
            case Temporal t -> true;
            case Date d -> true;
            case UUID u -> true;
            default -> false;
        };
        if (!scalar) {
            throw new UnsafeSqlException("parameter-type", "Parameter :" + name + " must be a single value", name);
        }
    }

    private static void scan(String sql, Visitor visitor) {
        if (sql == null) {
            return;
        }
        int n = sql.length();
        int codeStart = 0;
        int i = 0;
        while (i < n) {
            char c = sql.charAt(i);
            char next = i + 1 < n ? sql.charAt(i + 1) : 0;
            if (c == '-' && next == '-') {
                i = skipUntil(sql, i + 2, "\n");
            } else if (c == '/' && next == '*') {
                i = skipUntil(sql, i + 2, "*/");
            } else if (c == '\'' || c == '"' || c == '`') {
                i = skipQuoted(sql, i + 1, c);
            } else if (c == '[') {
                i = skipUntil(sql, i + 1, "]");
            } else if (c == ':' && next == ':') {
                i += 2;
            } else if (c == ':' && isNameStart(next)) {
                int end = i + 2;
                while (end < n && isNamePart(sql.charAt(end))) {
                    end++;
                }
                visitor.code(sql, codeStart, i);
                visitor.parameter(sql.substring(i + 1, end));
                i = end;
                codeStart = end;
            } else {
                i++;
            }
        }
        visitor.code(sql, codeStart, n);
    }

    private static boolean isNameStart(char c) {
        return c == '_' || c < 128 && Character.isLetter(c);
    }

    private static boolean isNamePart(char c) {
        return c == '_' || c < 128 && Character.isLetterOrDigit(c);
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
