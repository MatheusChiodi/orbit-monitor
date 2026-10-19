package io.orbit.api.privacy;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.BeanDescription;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializationConfig;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.databind.ser.BeanPropertyWriter;
import com.fasterxml.jackson.databind.ser.BeanSerializerModifier;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;
import io.orbit.common.privacy.Sensitive;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.monitor.http.HttpResponseSnapshot;
import io.orbit.monitor.privacy.PayloadRedactor;
import io.orbit.monitor.sql.ResultPayload;

import java.io.IOException;
import java.util.List;
import java.util.Objects;

/**
 * CORE-16 serialization guard: re-applies the redactor to every {@code ResultPayload},
 * {@code HttpResponseSnapshot} and {@code @Sensitive} value on the way out of the API and the
 * WebSocket, even if something upstream forgot to mask. Masking is idempotent, so already
 * masked values are unchanged.
 */
public class SensitiveDataModule extends SimpleModule {

    public SensitiveDataModule(SensitiveDataRedactor redactor) {
        super("orbit-sensitive-data");
        PayloadRedactor payloads = new PayloadRedactor(redactor);
        addSerializer(ResultPayload.class, new ResultPayloadSerializer(payloads));
        addSerializer(HttpResponseSnapshot.class, new HttpSnapshotSerializer(payloads));
        setSerializerModifier(new SensitiveFieldModifier(redactor));
    }

    private static final class ResultPayloadSerializer extends StdSerializer<ResultPayload> {
        private final transient PayloadRedactor payloads;

        ResultPayloadSerializer(PayloadRedactor payloads) {
            super(ResultPayload.class);
            this.payloads = payloads;
        }

        @Override
        public void serialize(ResultPayload value, JsonGenerator gen, SerializerProvider provider) throws IOException {
            ResultPayload masked = payloads.redact(value);
            gen.writeStartObject();
            provider.defaultSerializeField("columns", masked.columns(), gen);
            provider.defaultSerializeField("rows", masked.rows(), gen);
            gen.writeNumberField("ms", masked.ms());
            gen.writeBooleanField("truncated", masked.truncated());
            gen.writeEndObject();
        }
    }

    private static final class HttpSnapshotSerializer extends StdSerializer<HttpResponseSnapshot> {
        private final transient PayloadRedactor payloads;

        HttpSnapshotSerializer(PayloadRedactor payloads) {
            super(HttpResponseSnapshot.class);
            this.payloads = payloads;
        }

        @Override
        public void serialize(HttpResponseSnapshot value, JsonGenerator gen, SerializerProvider provider)
                throws IOException {
            HttpResponseSnapshot masked = payloads.redact(value);
            gen.writeStartObject();
            gen.writeNumberField("status", masked.status());
            gen.writeNumberField("responseTimeMs", masked.responseTimeMs());
            gen.writeStringField("body", masked.body());
            provider.defaultSerializeField("headers", masked.headers(), gen);
            provider.defaultSerializeField("certDaysLeft", masked.certDaysLeft(), gen);
            gen.writeEndObject();
        }
    }

    /** Swaps the serializer of every {@code @Sensitive} property for one that masks by name and value. */
    private static final class SensitiveFieldModifier extends BeanSerializerModifier {
        private final SensitiveDataRedactor redactor;

        SensitiveFieldModifier(SensitiveDataRedactor redactor) {
            this.redactor = redactor;
        }

        @Override
        public List<BeanPropertyWriter> changeProperties(SerializationConfig config, BeanDescription description,
                                                         List<BeanPropertyWriter> properties) {
            for (BeanPropertyWriter property : properties) {
                if (property.getAnnotation(Sensitive.class) != null) {
                    property.assignSerializer(new MaskedValueSerializer(redactor, property.getName()));
                }
            }
            return properties;
        }
    }

    private static final class MaskedValueSerializer extends JsonSerializer<Object> {
        private final SensitiveDataRedactor redactor;
        private final String field;

        MaskedValueSerializer(SensitiveDataRedactor redactor, String field) {
            this.redactor = redactor;
            this.field = field;
        }

        /** Detected data is masked by its class; anything else marked {@code @Sensitive} is masked generically. */
        @Override
        public void serialize(Object value, JsonGenerator gen, SerializerProvider provider) throws IOException {
            Object masked = redactor.redact(field, value);
            if (Objects.equals(masked, value)) {
                String text = String.valueOf(value);
                masked = value instanceof String && !text.isEmpty() ? text.charAt(0) + "•••" : "••••";
            }
            gen.writeString(String.valueOf(masked));
        }
    }
}
