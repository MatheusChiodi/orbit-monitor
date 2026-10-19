package io.orbit.history.applog;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.encoder.EncoderBase;

import java.nio.charset.StandardCharsets;

/** Logback encoder writing {@link MaskedJsonFormatter} lines as UTF-8; used by the ORBIT_FILE appender. */
public class MaskedJsonEncoder extends EncoderBase<ILoggingEvent> {

    private final MaskedJsonFormatter formatter = new MaskedJsonFormatter();

    @Override
    public byte[] headerBytes() {
        return null;
    }

    @Override
    public byte[] encode(ILoggingEvent event) {
        return formatter.format(event).getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public byte[] footerBytes() {
        return null;
    }
}
