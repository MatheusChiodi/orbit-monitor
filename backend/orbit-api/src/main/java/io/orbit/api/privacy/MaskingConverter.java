package io.orbit.api.privacy;

import ch.qos.logback.classic.pattern.ClassicConverter;
import ch.qos.logback.classic.spi.ILoggingEvent;
import io.orbit.common.privacy.SensitiveDataRedactor;

/**
 * CORE-16 log masking: Logback converter ({@code %maskedMsg}, registered in logback-spring.xml) that
 * masks card numbers, CPF/CNPJ, e-mails, phones, JWT/Bearer tokens and key=value secrets in every
 * log line, including the formatted arguments.
 */
public class MaskingConverter extends ClassicConverter {

    private static final SensitiveDataRedactor REDACTOR = new SensitiveDataRedactor();

    @Override
    public String convert(ILoggingEvent event) {
        return REDACTOR.redactText(event.getFormattedMessage());
    }
}
