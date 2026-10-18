package io.orbit.api.web;

import io.orbit.common.OperatorName;

/** Self-declared operator identity sent as {@code X-Orbit-Operator} (or {@code by} in the body). */
public final class Operators {

    public static final String HEADER = "X-Orbit-Operator";

    private Operators() {
    }

    /** First non-blank of header and fallback, normalized; a change without a name is refused. */
    public static String require(String header, String fallback) {
        String raw = header != null && !header.isBlank() ? header : fallback;
        if (raw == null || raw.isBlank()) {
            throw new OperatorRequiredException();
        }
        return OperatorName.normalize(raw);
    }

    /** Thrown when a change arrives without an operator name. */
    public static class OperatorRequiredException extends RuntimeException {
        public OperatorRequiredException() {
            super("Tell Orbit who you are: send the " + HEADER + " header");
        }
    }
}
