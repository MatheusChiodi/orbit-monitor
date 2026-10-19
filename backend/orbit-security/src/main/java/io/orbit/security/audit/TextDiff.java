package io.orbit.security.audit;

/** BE-46: line diff recorded in the audit trail when a SELECT changes (both sides are masked first). */
public final class TextDiff {

    private TextDiff() {
    }

    /** Unified-style diff: {@code -} removed lines, {@code +} added lines; empty when equal. */
    public static String of(String before, String after) {
        throw new UnsupportedOperationException("BE-46 SELECT change diff is not implemented yet");
    }
}
