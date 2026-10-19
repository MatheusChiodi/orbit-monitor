package io.orbit.api.privacy;

import ch.qos.logback.classic.pattern.ClassicConverter;
import ch.qos.logback.classic.spi.ILoggingEvent;

/**
 * CORE-16 log masking: Logback converter ({@code %maskedMsg}) that masks card numbers, CPF/CNPJ,
 * e-mails, JWT/Bearer tokens and key=value secrets in every log line.
 */
public class MaskingConverter extends ClassicConverter {

    @Override
    public String convert(ILoggingEvent event) {
        throw new UnsupportedOperationException("CORE-16 log masking is not implemented yet");
    }
}
