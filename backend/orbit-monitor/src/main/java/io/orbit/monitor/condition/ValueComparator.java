package io.orbit.monitor.condition;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeParseException;
import java.util.Date;
import java.util.Optional;

/** Coerces actual values (from JSON, JDBC, HTTP) so they can be compared with operands. */
final class ValueComparator {

    private ValueComparator() {
    }

    /** Compares the actual value with the operand: negative, zero or positive. */
    static int compare(Object actual, Operand operand, Clock clock) {
        return switch (operand) {
            case Operand.NumberOperand n -> requireNumber(actual).compareTo(n.value());
            case Operand.DurationOperand d -> requireNumber(actual).compareTo(BigDecimal.valueOf(d.value().toMillis()));
            case Operand.RelativeTimeOperand r -> requireInstant(actual, clock).compareTo(clock.instant().plus(r.offset()));
            case Operand.TextOperand t -> number(t.value())
                    .map(n -> requireNumber(actual).compareTo(n))
                    .orElseThrow(() -> new IncomparableValuesException("Text cannot be ordered: " + t.value()));
            case Operand.RangeOperand r -> throw new IncomparableValuesException("A range is only valid with between");
            case Operand.ListOperand l -> throw new IncomparableValuesException("A list is only valid with in");
        };
    }

    /** Lenient equality: numeric when both sides are numbers, textual otherwise. */
    static boolean matches(Object actual, Operand operand, Clock clock) {
        return switch (operand) {
            case Operand.TextOperand t -> {
                Optional<BigDecimal> expected = number(t.value());
                Optional<BigDecimal> real = actual instanceof Number || actual instanceof Duration
                        ? number(actual) : Optional.empty();
                yield expected.isPresent() && real.isPresent()
                        ? expected.get().compareTo(real.get()) == 0
                        : String.valueOf(actual).equals(t.value());
            }
            case Operand.NumberOperand n -> number(actual).map(v -> v.compareTo(n.value()) == 0).orElse(false);
            case Operand.ListOperand l -> l.values().stream().anyMatch(v -> matches(actual, v, clock));
            default -> compare(actual, operand, clock) == 0;
        };
    }

    static Optional<BigDecimal> number(Object value) {
        return switch (value) {
            case null -> Optional.empty();
            case BigDecimal b -> Optional.of(b);
            case Double d -> Optional.of(BigDecimal.valueOf(d));
            case Float f -> Optional.of(BigDecimal.valueOf(f.doubleValue()));
            case Number n -> Optional.of(new BigDecimal(n.toString()));
            case Duration d -> Optional.of(BigDecimal.valueOf(d.toMillis()));
            case String s -> parseNumber(s);
            default -> Optional.empty();
        };
    }

    static Optional<Instant> instant(Object value, Clock clock) {
        return switch (value) {
            case null -> Optional.empty();
            case Instant i -> Optional.of(i);
            case LocalDateTime ldt -> Optional.of(ldt.atZone(clock.getZone()).toInstant());
            case OffsetDateTime odt -> Optional.of(odt.toInstant());
            case ZonedDateTime zdt -> Optional.of(zdt.toInstant());
            case LocalDate ld -> Optional.of(ld.atStartOfDay(clock.getZone()).toInstant());
            case Date d -> Optional.of(d.toInstant());
            case String s -> parseInstant(s, clock);
            default -> Optional.empty();
        };
    }

    static BigDecimal requireNumber(Object actual) {
        return number(actual).orElseThrow(() -> new IncomparableValuesException("Not a number: " + actual));
    }

    static Instant requireInstant(Object actual, Clock clock) {
        return instant(actual, clock)
                .orElseThrow(() -> new IncomparableValuesException("Not a date/time: " + actual));
    }

    private static Optional<BigDecimal> parseNumber(String s) {
        try {
            return Optional.of(new BigDecimal(s.trim()));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    private static Optional<Instant> parseInstant(String s, Clock clock) {
        String text = s.trim();
        try {
            return Optional.of(OffsetDateTime.parse(text).toInstant());
        } catch (DateTimeParseException ignored) {
            // no offset: parse as a local date-time in the clock zone
        }
        try {
            return Optional.of(LocalDateTime.parse(text.replace(' ', 'T')).atZone(clock.getZone()).toInstant());
        } catch (DateTimeParseException e) {
            return Optional.empty();
        }
    }
}
