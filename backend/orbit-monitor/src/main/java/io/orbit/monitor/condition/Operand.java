package io.orbit.monitor.condition;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;

/** Right-hand side of a condition, typed by the parser. */
public sealed interface Operand {

    record NumberOperand(BigDecimal value) implements Operand { }

    record DurationOperand(Duration value) implements Operand { }

    record TextOperand(String value) implements Operand { }

    /** {@code now() - 60min} becomes an offset of -60 minutes from the evaluation clock. */
    record RelativeTimeOperand(Duration offset) implements Operand { }

    record RangeOperand(Operand low, Operand high) implements Operand { }

    record ListOperand(List<Operand> values) implements Operand {
        public ListOperand {
            values = List.copyOf(values);
        }
    }
}
