package io.orbit.monitor.condition;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;

/** Lado direito de uma condição, já tipado pelo parser. */
public sealed interface Operand {

    record NumberOperand(BigDecimal value) implements Operand { }

    record DurationOperand(Duration value) implements Operand { }

    record TextOperand(String value) implements Operand { }

    /** {@code now() - 60min} vira offset de -60 minutos sobre o relógio da avaliação. */
    record RelativeTimeOperand(Duration offset) implements Operand { }

    record RangeOperand(Operand low, Operand high) implements Operand { }

    record ListOperand(List<Operand> values) implements Operand {
        public ListOperand {
            values = List.copyOf(values);
        }
    }
}
