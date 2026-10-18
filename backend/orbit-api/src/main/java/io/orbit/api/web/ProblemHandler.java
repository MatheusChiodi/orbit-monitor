package io.orbit.api.web;

import io.orbit.alerting.IncidentNotFoundException;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.config.ConfigValidationException;
import io.orbit.monitor.condition.ConditionSyntaxException;
import io.orbit.monitor.sql.UnsafeSqlException;
import io.orbit.probe.http.HttpProbeException;
import io.orbit.probe.http.SsrfBlockedException;
import io.orbit.probe.sql.SqlProbeException;
import io.orbit.security.vault.VaultException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** RFC 9457 Problem Details with a stable {@code code} property; messages are masked before leaving. */
@RestControllerAdvice
public class ProblemHandler {

    private final SensitiveDataRedactor redactor;

    public ProblemHandler(SensitiveDataRedactor redactor) {
        this.redactor = redactor;
    }

    @ExceptionHandler(ConfigValidationException.class)
    ProblemDetail invalidConfig(ConfigValidationException e) {
        ProblemDetail problem = problem(HttpStatus.UNPROCESSABLE_ENTITY, "invalid-config", "Invalid configuration",
                "The configuration was not saved");
        problem.setProperty("errors", e.errors().stream().map(redactor::redactText).toList());
        return problem;
    }

    @ExceptionHandler(UnsafeSqlException.class)
    ProblemDetail unsafeSql(UnsafeSqlException e) {
        return problem(HttpStatus.UNPROCESSABLE_ENTITY, "unsafe-sql", "SELECT rejected", e.getMessage());
    }

    @ExceptionHandler(ConditionSyntaxException.class)
    ProblemDetail invalidCondition(ConditionSyntaxException e) {
        return problem(HttpStatus.UNPROCESSABLE_ENTITY, "invalid-condition", "Invalid condition", e.getMessage());
    }

    @ExceptionHandler(SsrfBlockedException.class)
    ProblemDetail ssrf(SsrfBlockedException e) {
        return problem(HttpStatus.UNPROCESSABLE_ENTITY, "ssrf-blocked", "Target not allowed", e.getMessage());
    }

    @ExceptionHandler(VaultException.class)
    ProblemDetail vault(VaultException e) {
        return problem(HttpStatus.UNPROCESSABLE_ENTITY, "secret-error", "Secret problem", e.getMessage());
    }

    @ExceptionHandler({SqlProbeException.class, HttpProbeException.class})
    ProblemDetail target(RuntimeException e) {
        return problem(HttpStatus.BAD_GATEWAY, "target-error", "Target did not answer as expected", e.getMessage());
    }

    @ExceptionHandler({NotFoundException.class, IncidentNotFoundException.class})
    ProblemDetail notFound(RuntimeException e) {
        return problem(HttpStatus.NOT_FOUND, "not-found", "Not found", e.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    ProblemDetail conflict(IllegalStateException e) {
        return problem(HttpStatus.CONFLICT, "conflict", "Conflict", e.getMessage());
    }

    @ExceptionHandler(Operators.OperatorRequiredException.class)
    ProblemDetail operator(Operators.OperatorRequiredException e) {
        return problem(HttpStatus.BAD_REQUEST, "operator-required", "Operator name required", e.getMessage());
    }

    @ExceptionHandler({IllegalArgumentException.class, HttpMessageNotReadableException.class})
    ProblemDetail badRequest(Exception e) {
        String detail = e instanceof HttpMessageNotReadableException ? "Malformed request body" : e.getMessage();
        return problem(HttpStatus.BAD_REQUEST, "bad-request", "Bad request", detail);
    }

    private ProblemDetail problem(HttpStatus status, String code, String title, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, redactor.redactText(detail));
        problem.setTitle(title);
        problem.setProperty("code", code);
        return problem;
    }
}
