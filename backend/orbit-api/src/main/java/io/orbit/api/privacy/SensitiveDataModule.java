package io.orbit.api.privacy;

import com.fasterxml.jackson.databind.module.SimpleModule;
import io.orbit.common.privacy.SensitiveDataRedactor;

/**
 * CORE-16 serialization guard: re-applies the redactor to every {@code ResultPayload},
 * {@code HttpResponseSnapshot} and {@code @Sensitive} value on the way out of the API and the
 * WebSocket, even if something upstream forgot to mask.
 */
public class SensitiveDataModule extends SimpleModule {

    public SensitiveDataModule(SensitiveDataRedactor redactor) {
        super("orbit-sensitive-data");
        throw new UnsupportedOperationException("CORE-16 Jackson serialization guard is not implemented yet");
    }
}
