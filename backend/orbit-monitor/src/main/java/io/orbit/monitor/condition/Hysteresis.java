package io.orbit.monitor.condition;

import java.math.BigDecimal;
import java.time.Duration;

/**
 * Hysteresis for leaving WARN/DOWN: while a monitor is unhealthy its thresholds are tightened by
 * a ratio (default 10%), so {@code [COL].QTY < 200} only recovers below 180. This stops a value
 * hovering around the limit from flapping. Equality, lists and text are never tightened.
 */
public final class Hysteresis {

    public static final double DEFAULT_RATIO = 0.10;

    private Hysteresis() {
    }

    public static Condition tighten(Condition condition, double ratio) {
        if (ratio <= 0) {
            return condition;
        }
        BigDecimal r = BigDecimal.valueOf(ratio);
        Operand operand = condition.operand();
        Operand tightened = switch (condition.operator()) {
            case LT, LE -> shift(operand, r.negate());
            case GT, GE -> shift(operand, r);
            case BETWEEN -> shrink((Operand.RangeOperand) operand, r);
            case NEWER_THAN -> scaleDuration(operand, BigDecimal.ONE.subtract(r));
            case OLDER_THAN -> scaleDuration(operand, BigDecimal.ONE.add(r));
            default -> operand;
        };
        return tightened == operand ? condition : new Condition(condition.expression(), condition.placeholder(),
                condition.path(), condition.operator(), tightened, condition.severity());
    }

    /** Moves a bound by {@code |value| * signedRatio}. */
    private static Operand shift(Operand operand, BigDecimal signedRatio) {
        return switch (operand) {
            case Operand.NumberOperand n -> new Operand.NumberOperand(n.value().add(n.value().abs().multiply(signedRatio)));
            case Operand.DurationOperand d -> new Operand.DurationOperand(shiftMillis(d.value(), signedRatio));
            case Operand.RelativeTimeOperand t -> new Operand.RelativeTimeOperand(shiftMillis(t.offset(), signedRatio));
            default -> operand;
        };
    }

    private static Operand shrink(Operand.RangeOperand range, BigDecimal r) {
        if (range.low() instanceof Operand.NumberOperand low && range.high() instanceof Operand.NumberOperand high) {
            BigDecimal delta = high.value().subtract(low.value()).abs().multiply(r).divide(BigDecimal.valueOf(2));
            return new Operand.RangeOperand(new Operand.NumberOperand(low.value().add(delta)),
                    new Operand.NumberOperand(high.value().subtract(delta)));
        }
        return range;
    }

    private static Operand scaleDuration(Operand operand, BigDecimal factor) {
        if (operand instanceof Operand.DurationOperand d) {
            long millis = BigDecimal.valueOf(d.value().toMillis()).multiply(factor).longValue();
            return new Operand.DurationOperand(Duration.ofMillis(millis));
        }
        return operand;
    }

    private static Duration shiftMillis(Duration value, BigDecimal signedRatio) {
        BigDecimal millis = BigDecimal.valueOf(value.toMillis());
        return Duration.ofMillis(millis.add(millis.abs().multiply(signedRatio)).longValue());
    }
}
