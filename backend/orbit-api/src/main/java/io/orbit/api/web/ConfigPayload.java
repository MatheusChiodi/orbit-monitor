package io.orbit.api.web;

import io.orbit.config.ConfigFile;

import java.util.List;

/**
 * Same shape as an {@code orbit.<feature>.json} file ({@code { version, items }}), the contract of the
 * frontend config client ({@code frontend/src/shared/api/configResources.ts}). Secrets are never in it.
 */
public record ConfigPayload<T>(int version, List<T> items) {

    public static <T> ConfigPayload<T> of(List<T> items) {
        return new ConfigPayload<>(ConfigFile.CURRENT_VERSION, items);
    }
}
