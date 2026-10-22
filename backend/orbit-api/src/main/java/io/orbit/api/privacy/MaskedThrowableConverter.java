package io.orbit.api.privacy;

import ch.qos.logback.classic.pattern.ExtendedThrowableProxyConverter;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.core.CoreConstants;
import io.orbit.common.privacy.SensitiveDataRedactor;

/**
 * CORE-16 log masking for stack traces ({@code %maskedEx}, registered in logback-spring.xml): exception
 * and cause messages (a JDBC error quoting a row, an HTTP client echoing a body) are masked like
 * {@link MaskingConverter} masks the message. Like Spring's {@code %wEx}, a trace starts on a new line.
 */
public class MaskedThrowableConverter extends ExtendedThrowableProxyConverter {

    private static final SensitiveDataRedactor REDACTOR = new SensitiveDataRedactor();

    @Override
    protected String throwableProxyToString(IThrowableProxy throwable) {
        return CoreConstants.LINE_SEPARATOR + REDACTOR.redactText(super.throwableProxyToString(throwable));
    }
}
