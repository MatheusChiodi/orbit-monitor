package io.orbit.monitor.condition;

/**
 * Lado esquerdo de uma condição: o dado do resultado que será avaliado.
 * Alguns placeholders exigem um caminho ({@code [COL].QTD}, {@code [HEADER].x}),
 * outros não aceitam ({@code [STATUS]}), e o {@code [BODY]} aceita ambos.
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
