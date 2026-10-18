package io.orbit.common.privacy;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Detects and masks card data, personal data and secrets (docs/04-data-protection.md).
 * Detection looks at both the field name and the value; either match classifies the field.
 * A full card number never survives: at most the last four digits are kept.
 */
public class SensitiveDataRedactor {

    static final String DOTS = "••••";
    static final String REDACTED = "[REDACTED]";

    private static final Set<String> PAN_NAMES = Set.of("card", "pan", "card_number", "cartao", "num_cartao", "ccnum");
    private static final Set<String> SAD_NAMES = Set.of("cvv", "cvc", "cvv2", "cid", "track", "track1", "track2",
            "pin", "pin_block", "pinblock");
    private static final Set<String> SECRET_NAMES = Set.of("password", "passwd", "senha", "secret", "token",
            "api_key", "apikey", "credential", "credentials", "authorization");
    private static final Set<String> PERSONAL_NAMES = Set.of("cpf", "cnpj", "email", "e_mail", "phone", "telefone",
            "celular", "mobile", "nome", "name", "address", "endereco");

    private static final Pattern PAN = Pattern.compile("(?<!\\d)(?:\\d[ -]?){12,18}\\d(?!\\d)");
    private static final Pattern CNPJ = Pattern.compile("(?<!\\d)\\d{2}\\.?\\d{3}\\.?\\d{3}/?\\d{4}-?\\d{2}(?!\\d)");
    private static final Pattern CPF = Pattern.compile("(?<![\\d.])\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}(?!\\d)");
    private static final Pattern EMAIL = Pattern.compile("([\\w.+-])[\\w.+-]*@([\\w-])[\\w.-]*\\.([A-Za-z]{2,})\\b");
    private static final Pattern PHONE = Pattern.compile("(?:\\+55\\s?)?\\(\\d{2}\\)\\s?(9?\\d{4})-?(\\d{4})");
    private static final Pattern JWT = Pattern.compile("eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]*");
    private static final Pattern BEARER = Pattern.compile("(?i)(bearer)\\s+[A-Za-z0-9._~+/=-]+");
    private static final Pattern KEY_VALUE_SECRET = Pattern.compile(
            "(?i)(\\b(?:password|passwd|pwd|senha|secret|token|api[_-]?key)\"?\\s*[=:]\\s*\"?)(?!\\$\\{env:)([^\\s\";,&}]+)");
    private static final Pattern CAMEL =Pattern.compile("(?<=[a-z0-9])(?=[A-Z])");

    public DataClass classifyName(String fieldName) {
        if (fieldName == null || fieldName.isBlank()) {
            return DataClass.NONE;
        }
        List<String> tokens = tokens(fieldName);
        if (matchesAny(tokens, SAD_NAMES)) {
            return DataClass.PCI_SAD;
        }
        if (matchesAny(tokens, PAN_NAMES)) {
            return DataClass.PCI_PAN;
        }
        if (matchesAny(tokens, SECRET_NAMES)) {
            return DataClass.SECRET;
        }
        return matchesAny(tokens, PERSONAL_NAMES) ? DataClass.PERSONAL : DataClass.NONE;
    }

    /** Masks a value according to its field name and content; harmless values are returned unchanged. */
    public Object redact(String fieldName, Object value) {
        if (value == null) {
            return null;
        }
        return switch (classifyName(fieldName)) {
            case PCI_SAD -> REDACTED;
            case SECRET -> DOTS;
            case PCI_PAN -> maskPanField(String.valueOf(value));
            case PERSONAL -> maskPersonalField(String.valueOf(value));
            case NONE -> redactUnnamed(value);
        };
    }

    /** Masks every sensitive pattern embedded in free text. */
    public String redactText(String text) {
        if (text == null || text.isEmpty()) {
            return text;
        }
        String s = replace(PAN, text, m -> {
            String digits = m.group().replaceAll("[ -]", "");
            return Luhn.isValid(digits) ? maskPan(digits) : m.group();
        });
        s = replace(CNPJ, s, m -> {
            String digits = m.group().replaceAll("\\D", "");
            return BrazilianDocuments.isCnpj(digits) ? "••.•••.•••/••••-" + digits.substring(12) : m.group();
        });
        s = replace(CPF, s, m -> {
            String digits = m.group().replaceAll("\\D", "");
            return BrazilianDocuments.isCpf(digits) ? "•••.•••.•••-" + digits.substring(9) : m.group();
        });
        s = replace(EMAIL, s, m -> m.group(1) + "•••@" + m.group(2) + "•••." + m.group(3));
        s = replace(PHONE, s, m -> "(••) " + "•".repeat(m.group(1).length()) + "-" + m.group(2));
        s = replace(JWT, s, m -> DOTS);
        s = replace(KEY_VALUE_SECRET, s, m -> m.group(1) + DOTS);
        return replace(BEARER, s, m -> m.group(1) + " " + DOTS);
    }

    private Object redactUnnamed(Object value) {
        return switch (value) {
            case String s -> redactText(s);
            case Integer i -> i;
            case Long l -> Luhn.isValid(Long.toString(Math.abs(l))) ? maskPan(Long.toString(Math.abs(l))) : l;
            case BigInteger b -> Luhn.isValid(b.abs().toString()) ? maskPan(b.abs().toString()) : b;
            case BigDecimal d -> integralDigits(d)
                    .filter(Luhn::isValid)
                    .<Object>map(SensitiveDataRedactor::maskPan)
                    .orElse(d);
            default -> value;
        };
    }

    private static java.util.Optional<String> integralDigits(BigDecimal d) {
        BigDecimal stripped = d.abs().stripTrailingZeros();
        return stripped.scale() <= 0 ? java.util.Optional.of(stripped.toPlainString()) : java.util.Optional.empty();
    }

    private static String maskPanField(String value) {
        String digits = value.replaceAll("[ -]", "");
        return digits.length() >= 13 && digits.chars().allMatch(Character::isDigit) ? maskPan(digits) : DOTS;
    }

    private String maskPersonalField(String value) {
        String masked = redactText(value);
        if (!masked.equals(value)) {
            return masked;
        }
        return value.isEmpty() ? "•••" : value.substring(0, 1) + "•••";
    }

    static String maskPan(String digits) {
        return "•••• •••• •••• " + digits.substring(digits.length() - 4);
    }

    private static String replace(Pattern pattern, String text, Function<Matcher, String> replacement) {
        Matcher m = pattern.matcher(text);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            m.appendReplacement(sb, Matcher.quoteReplacement(replacement.apply(m)));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    /** Splits {@code customerEmail}, {@code CARD_NUMBER} or {@code e-mail} into lower-case tokens. */
    private static List<String> tokens(String name) {
        String spaced = CAMEL.matcher(name).replaceAll("_");
        List<String> tokens = new ArrayList<>();
        for (String t : spaced.toLowerCase(Locale.ROOT).split("[^a-z0-9]+")) {
            if (!t.isEmpty()) {
                tokens.add(t);
            }
        }
        return tokens;
    }

    /** Matches single tokens and adjacent pairs joined with '_' ({@code api_key}, {@code pin_block}). */
    private static boolean matchesAny(List<String> tokens, Set<String> names) {
        for (int i = 0; i < tokens.size(); i++) {
            if (names.contains(tokens.get(i))) {
                return true;
            }
            if (i + 1 < tokens.size() && names.contains(tokens.get(i) + "_" + tokens.get(i + 1))) {
                return true;
            }
        }
        return false;
    }
}
