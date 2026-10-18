package io.orbit.monitor.condition;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/** Operators supported in conditions. */
public enum Operator {
    LE("<="),
    GE(">="),
    EQ("=="),
    NE("!="),
    LT("<"),
    GT(">"),
    BETWEEN("between"),
    IN("in"),
    OLDER_THAN("older than"),
    NEWER_THAN("newer than"),
    CONTAINS("contains");

    private final String symbol;

    Operator(String symbol) {
        this.symbol = symbol;
    }

    public String symbol() {
        return symbol;
    }

    /** Longest symbols first, so that {@code <=} matches before {@code <}. */
    static List<Operator> bySymbolLength() {
        return Arrays.stream(values())
                .sorted(Comparator.comparingInt((Operator o) -> o.symbol.length()).reversed())
                .toList();
    }

    static Optional<Operator> fromSymbol(String symbol) {
        return Arrays.stream(values()).filter(o -> o.symbol.equalsIgnoreCase(symbol)).findFirst();
    }
}
