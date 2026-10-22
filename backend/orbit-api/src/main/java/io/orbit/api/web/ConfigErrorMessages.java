package io.orbit.api.web;

import org.springframework.context.MessageSource;

import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * CORE-15: configuration validators (domain modules, no Spring) report stable English texts such as
 * {@code "tcp_db: port must be between 1 and 65535"}. This maps the known ones to message keys so
 * the {@code errors} list of a Problem Details answer follows {@code Accept-Language}; the item prefix
 * ({@code tcp_db: }, {@code step login: }) and the values are kept. Unknown texts stay as written.
 */
public class ConfigErrorMessages {

    private record Rule(Pattern pattern, String key) {
    }

    private static final List<Rule> RULES = List.of(
            rule("(.+) is required", "required"),
            rule("id must be lower-case letters, digits, '_' or '-'", "id-format"),
            rule("id is reserved", "id-reserved"),
            rule("a monitor with this id already exists", "id-taken"),
            rule("interval must be between 15 s and 24 h", "interval"),
            rule("timeout must be between 100 ms and 5 min", "timeout"),
            rule("downAfter must be between 1 and 10", "down-after"),
            rule("hysteresis must be between 0 and 0\\.5", "hysteresis"),
            rule("maxRows must be between 1 and 5000", "max-rows"),
            rule("poolSize must be between 1 and 3", "pool-size"),
            rule("port must be between 1 and 65535", "port"),
            rule("maxSilenceSeconds must be at least 60", "max-silence"),
            rule("card field (.+) cannot be stored as a series", "card-series"),
            rule("unknown connection (.+)", "unknown-connection"),
            rule("parameters need a value for (.+)", "parameters-missing"),
            rule("url must be http\\(s\\)://host/\\.\\.\\.", "url"),
            rule("invalid url", "url"),
            rule("unsupported method (.+)", "method"),
            rule("type must be (.+)", "type"),
            rule("probe\\.recordType must be A, AAAA, CNAME, MX, TXT or NS", "record-type"),
            rule("probe\\.bootstrapServers must be host:port, comma separated", "bootstrap"),
            rule("probe\\.domain must be a domain name such as example\\.com", "domain"),
            rule("a certificate check needs a host or probe\\.domain", "cert-target"),
            rule("at most (\\d+) steps", "steps-max"),
            rule("step name must be letters, digits, '_' or '-'", "step-name"),
            rule("step names must be unique", "step-unique"),
            rule("variable name (.+) is not valid", "variable-name"),
            rule("oauth\\.tokenUrl must be http\\(s\\)://host/\\.\\.\\.", "oauth-url"),
            rule("oauth\\.clientSecret is required \\(vault reference\\)", "oauth-secret"),
            rule("window: unknown day (.+)", "window-day"),
            rule("window: time must be HH:mm \\((.*)\\)", "window-time"),
            rule("window: unknown time zone (.+)", "window-zone"),
            rule("retry: attempts must be between 1 and (\\d+)", "retry-attempts"),
            rule("retry: delays must be between 0 and (\\d+) ms", "retry-delays"),
            rule("retry: multiplier must be between 1 and 10", "retry-multiplier"),
            rule("locale must be en or pt-BR", "locale"),
            rule("historyHours must be between 1 and 168", "history-hours"),
            rule("access\\.editFrom must be loopback, lan or cidr", "edit-from"),
            rule("access\\.cidrs is required when editFrom is cidr", "cidrs"),
            rule("branding\\.name must be at most 80 characters", "branding-name"));

    private final MessageSource source;

    public ConfigErrorMessages(MessageSource source) {
        this.source = source;
    }

    private static Rule rule(String regex, String key) {
        return new Rule(Pattern.compile("^(.*?: )?" + regex + "$"), "config.error." + key);
    }

    public String localize(String error, Locale locale) {
        if (error == null) {
            return null;
        }
        for (Rule rule : RULES) {
            Matcher m = rule.pattern().matcher(error);
            if (m.matches()) {
                Object[] args = new Object[m.groupCount() - 1];
                for (int i = 2; i <= m.groupCount(); i++) {
                    args[i - 2] = m.group(i);
                }
                String text = source.getMessage(rule.key(), args, null, locale);
                return text == null ? error : (m.group(1) == null ? "" : m.group(1)) + text;
            }
        }
        return error;
    }
}
