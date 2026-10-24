package io.orbit.api.web;

import io.orbit.alerting.IncidentNotFoundException;
import io.orbit.common.i18n.Localizable;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.config.ConfigValidationException;
import io.orbit.monitor.condition.ConditionSyntaxException;
import io.orbit.monitor.sql.UnsafeSqlException;
import io.orbit.probe.http.HttpProbeException;
import io.orbit.probe.http.SsrfBlockedException;
import io.orbit.probe.sql.SqlProbeException;
import io.orbit.security.vault.VaultException;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * RFC 9457 Problem Details with a stable English {@code code}; {@code title} and {@code detail} are
 * translated by {@code Accept-Language} (en default, pt-BR) and masked before leaving.
 */
@RestControllerAdvice
public class ProblemHandler {

    private final SensitiveDataRedactor redactor;
    private final Messages messages;

    public ProblemHandler(SensitiveDataRedactor redactor, Messages messages) {
        this.redactor = redactor;
        this.messages = messages;
    }

    @ExceptionHandler(ConfigValidationException.class)
    ProblemDetail invalidConfig(ConfigValidationException e) {
        ProblemDetail problem = problem(HttpStatus.UNPROCESSABLE_ENTITY, "invalid-config",
                messages.current("problem.invalid-config.detail"));
        problem.setProperty("errors", e.errors().stream().map(messages::configError).map(redactor::redactText)
                .toList());
        return problem;
    }

    @ExceptionHandler(UnsafeSqlException.class)
    ProblemDetail unsafeSql(UnsafeSqlException e) {
        return problem(HttpStatus.UNPROCESSABLE_ENTITY, "unsafe-sql", localized(e));
    }

    @ExceptionHandler(ConditionSyntaxException.class)
    ProblemDetail invalidCondition(ConditionSyntaxException e) {
        return problem(HttpStatus.UNPROCESSABLE_ENTITY, "invalid-condition", localized(e));
    }

    @ExceptionHandler(SsrfBlockedException.class)
    ProblemDetail ssrf(SsrfBlockedException e) {
        return problem(HttpStatus.UNPROCESSABLE_ENTITY, "ssrf-blocked", localized(e));
    }

    @ExceptionHandler(VaultException.class)
    ProblemDetail vault(VaultException e) {
        return problem(HttpStatus.UNPROCESSABLE_ENTITY, "secret-error", e.getMessage());
    }

    @ExceptionHandler({SqlProbeException.class, HttpProbeException.class})
    ProblemDetail target(RuntimeException e) {
        return problem(HttpStatus.BAD_GATEWAY, "target-error", e.getMessage());
    }

    @ExceptionHandler({NotFoundException.class, IncidentNotFoundException.class})
    ProblemDetail notFound(RuntimeException e) {
        return problem(HttpStatus.NOT_FOUND, "not-found", e.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    ProblemDetail dependants(ConflictException e) {
        ProblemDetail problem = problem(HttpStatus.CONFLICT, e.code(),
                messages.getOr("problem." + e.code() + ".detail", e.getMessage(),
                        LocaleContextHolder.getLocale(), e.args()));
        e.properties().forEach(problem::setProperty);
        return problem;
    }

    @ExceptionHandler(IllegalStateException.class)
    ProblemDetail conflict(IllegalStateException e) {
        return problem(HttpStatus.CONFLICT, "conflict", e.getMessage());
    }

    @ExceptionHandler({IllegalArgumentException.class, HttpMessageNotReadableException.class})
    ProblemDetail badRequest(Exception e) {
        String detail = e instanceof HttpMessageNotReadableException
                ? messages.current("problem.bad-request.detail") : e.getMessage();
        return problem(HttpStatus.BAD_REQUEST, "bad-request", detail);
    }

    private String localized(RuntimeException e) {
        return e instanceof Localizable l ? messages.of(l, e.getMessage()) : e.getMessage();
    }

    private ProblemDetail problem(HttpStatus status, String code, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, redactor.redactText(detail));
        problem.setTitle(messages.current("problem." + code + ".title"));
        problem.setProperty("code", code);
        return problem;
    }
}
