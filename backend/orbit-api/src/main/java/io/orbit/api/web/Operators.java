package io.orbit.api.web;

import io.orbit.common.OperatorName;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

/** Self-declared operator identity sent as {@code X-Orbit-Operator} (or {@code by} in the body). */
public final class Operators {

    public static final String HEADER = "X-Orbit-Operator";

    private Operators() {
    }

    /**
     * First non-blank of header and fallback, normalized; a change without a name is refused.
     * The header is percent-encoded UTF-8 ({@code Jo%C3%A3o}) because HTTP headers are ASCII.
     */
    public static String require(String header, String fallback) {
        String raw = header != null && !header.isBlank() ? decode(header) : fallback;
        if (raw == null || raw.isBlank()) {
            throw new OperatorRequiredException();
        }
        return OperatorName.normalize(raw);
    }

    private static String decode(String header) {
        try {
            return URLDecoder.decode(header.replace("+", "%2B"), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            return header;
        }
    }

    /** Thrown when a change arrives without an operator name. */
    public static class OperatorRequiredException extends RuntimeException {
        public OperatorRequiredException() {
            super("Tell Orbit who you are: send the " + HEADER + " header");
        }
    }
}
