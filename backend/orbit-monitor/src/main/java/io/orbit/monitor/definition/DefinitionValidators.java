package io.orbit.monitor.definition;

import io.orbit.common.privacy.DataClass;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.monitor.condition.ConditionSyntaxException;
import io.orbit.monitor.sql.Dialect;
import io.orbit.monitor.sql.SelectValidator;
import io.orbit.monitor.sql.UnsafeSqlException;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/** Per-file validation rules for connections, SELECT monitors and HTTP monitors. */
final class DefinitionValidators {

    private static final Pattern ID = Pattern.compile("[a-z][a-z0-9_-]{1,63}");
    private static final Set<String> METHODS = Set.of("GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
    private static final SelectValidator SELECTS = new SelectValidator();
    private static final SensitiveDataRedactor REDACTOR = new SensitiveDataRedactor();

    private DefinitionValidators() {
    }

    static List<String> connections(List<ConnectionDef> items) {
        List<String> errors = new ArrayList<>();
        for (ConnectionDef c : items) {
            id(c.id(), errors);
            required(c.id(), "name", c.name(), errors);
            required(c.id(), "username", c.username(), errors);
            try {
                Dialect.fromJdbcUrl(c.jdbcUrl() == null ? "" : c.jdbcUrl());
            } catch (IllegalArgumentException e) {
                errors.add(c.id() + ": " + e.getMessage());
            }
            if (c.poolSize() < 1 || c.poolSize() > 3) {
                errors.add(c.id() + ": poolSize must be between 1 and 3");
            }
        }
        return errors;
    }

    static List<String> selects(List<SqlMonitorDef> items) {
        List<String> errors = new ArrayList<>();
        for (SqlMonitorDef s : items) {
            common(s, errors);
            required(s.id(), "connectionId", s.connectionId(), errors);
            try {
                SELECTS.validate(s.sql());
            } catch (UnsafeSqlException e) {
                errors.add(s.id() + ": " + e.getMessage());
            }
            if (s.maxRows() < 1 || s.maxRows() > 5_000) {
                errors.add(s.id() + ": maxRows must be between 1 and 5000");
            }
        }
        return errors;
    }

    static List<String> requests(List<HttpMonitorDef> items) {
        List<String> errors = new ArrayList<>();
        for (HttpMonitorDef r : items) {
            common(r, errors);
            if (r.method() == null || !METHODS.contains(r.method().toUpperCase(Locale.ROOT))) {
                errors.add(r.id() + ": unsupported method " + r.method());
            }
            try {
                URI uri = URI.create(r.url());
                String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
                if (!scheme.equals("http") && !scheme.equals("https") || uri.getHost() == null) {
                    errors.add(r.id() + ": url must be http(s)://host/...");
                }
            } catch (IllegalArgumentException | NullPointerException e) {
                errors.add(r.id() + ": invalid url");
            }
        }
        return errors;
    }

    private static void common(MonitorDef m, List<String> errors) {
        id(m.id(), errors);
        required(m.id(), "name", m.name(), errors);
        if (m.intervalSeconds() < 15 || m.intervalSeconds() > 86_400) {
            errors.add(m.id() + ": interval must be between 15 s and 24 h");
        }
        if (m.timeoutMs() < 100 || m.timeoutMs() > 300_000) {
            errors.add(m.id() + ": timeout must be between 100 ms and 5 min");
        }
        if (m.downAfter() < 1 || m.downAfter() > 10) {
            errors.add(m.id() + ": downAfter must be between 1 and 10");
        }
        if (m.hysteresis() < 0 || m.hysteresis() > 0.5) {
            errors.add(m.id() + ": hysteresis must be between 0 and 0.5");
        }
        for (FieldDef f : m.fields()) {
            DataClass dataClass = REDACTOR.classifyName(f.key());
            if (f.series() && (dataClass == DataClass.PCI_PAN || dataClass == DataClass.PCI_SAD)) {
                errors.add(m.id() + ": card field " + f.key() + " cannot be stored as a series");
            }
        }
        for (ConditionDef c : m.conditions()) {
            try {
                c.parse();
            } catch (ConditionSyntaxException e) {
                errors.add(m.id() + ": " + c.expression() + ": " + e.getMessage());
            }
        }
    }

    private static void id(String id, List<String> errors) {
        if (!ID.matcher(id).matches()) {
            errors.add(id + ": id must be lower-case letters, digits, '_' or '-'");
        }
    }

    private static void required(String id, String field, String value, List<String> errors) {
        if (value == null || value.isBlank()) {
            errors.add(id + ": " + field + " is required");
        }
    }
}
