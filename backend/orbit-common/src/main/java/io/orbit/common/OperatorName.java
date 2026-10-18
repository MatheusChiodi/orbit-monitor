package io.orbit.common;

/**
 * Self-declared operator name (there is no login). It is recorded on acknowledgements,
 * comments and audit entries, so it is normalized and bounded.
 */
public final class OperatorName {

    public static final int MAX_LENGTH = 60;

    private OperatorName() {
    }

    /** Trims, drops control characters, collapses spaces and caps the length; blank is rejected. */
    public static String normalize(String raw) {
        if (raw == null) {
            throw new IllegalArgumentException("Operator name is required");
        }
        String cleaned = raw.replaceAll("\\p{Cntrl}", " ").replaceAll("\\s+", " ").strip();
        if (cleaned.isEmpty()) {
            throw new IllegalArgumentException("Operator name is required");
        }
        return cleaned.length() > MAX_LENGTH ? cleaned.substring(0, MAX_LENGTH) : cleaned;
    }
}
