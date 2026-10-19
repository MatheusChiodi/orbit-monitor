package io.orbit.history.applog;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.classic.spi.ThrowableProxyUtil;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.orbit.common.privacy.SensitiveDataRedactor;
import org.springframework.boot.logging.structured.StructuredLogFormatter;

import java.time.Instant;
import java.util.Map;

/**
 * Application log line formatter (BE-53): one JSON object per line with timestamp, level, logger,
 * thread, message, MDC and exception, every text passed through the privacy redactor so card
 * numbers, documents, e-mails and secrets never reach the log file (docs/04).
 * Registered with {@code logging.structured.format.file} in {@code orbit-logging.properties}.
 */
public class MaskedJsonFormatter implements StructuredLogFormatter<ILoggingEvent> {

    private static final ObjectMapper JSON = new ObjectMapper();

    private final SensitiveDataRedactor redactor = new SensitiveDataRedactor();

    @Override
    public String format(ILoggingEvent event) {
        ObjectNode line = JSON.createObjectNode();
        line.put("@timestamp", Instant.ofEpochMilli(event.getTimeStamp()).toString());
        line.put("level", event.getLevel().toString());
        line.put("logger", event.getLoggerName());
        line.put("thread", event.getThreadName());
        line.put("message", redactor.redactText(event.getFormattedMessage()));
        Map<String, String> mdc = event.getMDCPropertyMap();
        if (mdc != null && !mdc.isEmpty()) {
            ObjectNode node = line.putObject("mdc");
            mdc.forEach((k, v) -> node.put(k, String.valueOf(redactor.redact(k, redactor.redactText(v)))));
        }
        IThrowableProxy error = event.getThrowableProxy();
        if (error != null) {
            line.put("exception", redactor.redactText(ThrowableProxyUtil.asString(error)));
        }
        try {
            return JSON.writeValueAsString(line) + "\n";
        } catch (JsonProcessingException e) {
            return "{\"level\":\"ERROR\",\"message\":\"log line could not be serialized\"}\n";
        }
    }
}
