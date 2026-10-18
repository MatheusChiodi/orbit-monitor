package io.orbit.monitor.condition;

/**
 * Left-hand side of a condition: the piece of the result being evaluated.
 * Some placeholders require a path ({@code [COL].QTY}, {@code [HEADER].x}),
 * others reject one ({@code [STATUS]}), and {@code [BODY]} accepts both.
 */
public enum Placeholder {
    STATUS(PathRule.FORBIDDEN),
    RESPONSE_TIME(PathRule.FORBIDDEN),
    BODY(PathRule.OPTIONAL),
    HEADER(PathRule.REQUIRED),
    CERT_DAYS_LEFT(PathRule.FORBIDDEN),
    ROWS(PathRule.FORBIDDEN),
    COL(PathRule.REQUIRED),
    EXEC_TIME(PathRule.FORBIDDEN);

    enum PathRule { FORBIDDEN, OPTIONAL, REQUIRED }

    private final PathRule pathRule;

    Placeholder(PathRule pathRule) {
        this.pathRule = pathRule;
    }

    boolean accepts(String path) {
        return switch (pathRule) {
            case FORBIDDEN -> path == null;
            case OPTIONAL -> true;
            case REQUIRED -> path != null;
        };
    }
}
