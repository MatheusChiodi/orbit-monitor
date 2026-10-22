package io.orbit.monitor.condition;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/**
 * Parses short Gatus-style expressions such as
 * {@code [COL].PENDING_QTY < 50} or {@code [RESPONSE_TIME] < 800ms}.
 * There is no script engine: the grammar is closed and every part becomes a type.
 */
public class ConditionParser {

    private static final Pattern LEFT = Pattern.compile("^\\[(\\w+)](?:\\.(\\S+))?\\s+(.+)$");
    private static final Pattern NUMBER = Pattern.compile("^-?\\d+(?:\\.\\d+)?$");
    private static final Pattern DURATION = Pattern.compile("^(\\d+(?:\\.\\d+)?)\\s*(ms|s|min|m|h|d)$");
    private static final Pattern NOW = Pattern.compile("^now\\(\\)\\s*(?:([+-])\\s*(.+))?$");
    private static final Pattern BARE_WORD = Pattern.compile("^[A-Za-z_][\\w.\\-]*$");
    private static final Pattern BETWEEN = Pattern.compile("^(.+?)\\s+and\\s+(.+)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern LIST = Pattern.compile("^[(\\[](.*)[)\\]]$");

    public Condition parse(String expression, Severity severity) {
        String expr = expression == null ? "" : expression.trim();
        Matcher left = LEFT.matcher(expr);
        if (!left.matches()) {
            throw new ConditionSyntaxException("format", "Expected format: [PLACEHOLDER] operator value");
        }
        Placeholder placeholder = placeholder(left.group(1));
        String path = left.group(2);
        if (!placeholder.accepts(path)) {
            throw path == null
                    ? new ConditionSyntaxException("field-required",
                            "[" + placeholder + "] requires a field, e.g. [" + placeholder + "].NAME", placeholder)
                    : new ConditionSyntaxException("field-not-allowed", "[" + placeholder + "] does not accept a field",
                            placeholder);
        }
        String rest = left.group(3).trim();
        Operator operator = operator(rest);
        String right = rest.substring(operator.symbol().length()).trim();
        if (right.isEmpty()) {
            throw new ConditionSyntaxException("missing-value", "Missing value after '" + operator.symbol() + "'",
                    operator.symbol());
        }
        return new Condition(expr, placeholder, path, operator, operand(operator, right), severity);
    }

    private static Placeholder placeholder(String name) {
        try {
            return Placeholder.valueOf(name.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ConditionSyntaxException("unknown-placeholder", "Unknown placeholder: [" + name + "]", name);
        }
    }

    private static Operator operator(String rest) {
        String lower = rest.toLowerCase(Locale.ROOT);
        for (Operator op : Operator.bySymbolLength()) {
            String symbol = op.symbol();
            if (!lower.startsWith(symbol)) {
                continue;
            }
            boolean isWord = Character.isLetter(symbol.charAt(0));
            if (isWord && (rest.length() == symbol.length() || !Character.isWhitespace(rest.charAt(symbol.length())))) {
                continue;
            }
            return op;
        }
        throw new ConditionSyntaxException("invalid-operator", "Invalid operator in: " + rest, rest);
    }

    private static Operand operand(Operator operator, String right) {
        return switch (operator) {
            case BETWEEN -> {
                Matcher m = BETWEEN.matcher(right);
                if (!m.matches()) {
                    throw new ConditionSyntaxException("between-format", "Use: between <min> and <max>");
                }
                yield new Operand.RangeOperand(literal(m.group(1).trim()), literal(m.group(2).trim()));
            }
            case IN -> {
                Matcher m = LIST.matcher(right);
                if (!m.matches()) {
                    throw new ConditionSyntaxException("in-format", "Use: in (a, b, c)");
                }
                yield new Operand.ListOperand(splitList(m.group(1)).stream().map(ConditionParser::literal).toList());
            }
            case OLDER_THAN, NEWER_THAN -> new Operand.DurationOperand(duration(right));
            case MATCHES -> regex(right);
            default -> literal(right);
        };
    }

    static Operand literal(String raw) {
        String text = raw.trim();
        if (text.length() >= 2 && isQuote(text.charAt(0)) && text.charAt(text.length() - 1) == text.charAt(0)) {
            return new Operand.TextOperand(text.substring(1, text.length() - 1));
        }
        Matcher now = NOW.matcher(text);
        if (now.matches()) {
            if (now.group(1) == null) {
                return new Operand.RelativeTimeOperand(Duration.ZERO);
            }
            Duration offset = duration(now.group(2).trim());
            return new Operand.RelativeTimeOperand(now.group(1).equals("-") ? offset.negated() : offset);
        }
        if (DURATION.matcher(text).matches()) {
            return new Operand.DurationOperand(duration(text));
        }
        if (NUMBER.matcher(text).matches()) {
            return new Operand.NumberOperand(new BigDecimal(text));
        }
        if (BARE_WORD.matcher(text).matches()) {
            return new Operand.TextOperand(text);
        }
        throw new ConditionSyntaxException("invalid-value", "Invalid value: " + text, text);
    }

    /** A {@code matches} operand is a quoted regular expression, validated here so errors show at save time. */
    private static Operand regex(String right) {
        if (!(literal(right) instanceof Operand.TextOperand text)) {
            throw new ConditionSyntaxException("invalid-regex", "Invalid regular expression: " + right, right);
        }
        try {
            Pattern.compile(text.value());
        } catch (PatternSyntaxException e) {
            throw new ConditionSyntaxException("invalid-regex", "Invalid regular expression: " + text.value(),
                    text.value());
        }
        return text;
    }

    static Duration duration(String raw) {
        Matcher m = DURATION.matcher(raw.trim());
        if (!m.matches()) {
            throw new ConditionSyntaxException("invalid-duration", "Invalid duration (use ms, s, min, h, d): " + raw, raw);
        }
        long factorMs = switch (m.group(2)) {
            case "ms" -> 1L;
            case "s" -> 1_000L;
            case "m", "min" -> 60_000L;
            case "h" -> 3_600_000L;
            default -> 86_400_000L;
        };
        BigDecimal millis = new BigDecimal(m.group(1)).multiply(BigDecimal.valueOf(factorMs));
        return Duration.ofMillis(millis.setScale(0, RoundingMode.HALF_UP).longValueExact());
    }

    private static boolean isQuote(char c) {
        return c == '"' || c == '\'';
    }

    /** Splits on commas, respecting quotes. */
    private static List<String> splitList(String body) {
        List<String> items = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        char quote = 0;
        for (char c : body.toCharArray()) {
            if (quote != 0) {
                quote = c == quote ? 0 : quote;
            } else if (isQuote(c)) {
                quote = c;
            } else if (c == ',') {
                items.add(current.toString().trim());
                current.setLength(0);
                continue;
            }
            current.append(c);
        }
        items.add(current.toString().trim());
        if (items.stream().anyMatch(String::isEmpty)) {
            throw new ConditionSyntaxException("empty-list-item", "List with an empty item: (" + body + ")", body);
        }
        return items;
    }
}
