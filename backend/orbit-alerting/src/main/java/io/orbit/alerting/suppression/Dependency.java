package io.orbit.alerting.suppression;

import io.orbit.config.ConfigItem;

/**
 * BE-30: one edge of orbit.dependencies.json: {@code downstream} depends on {@code upstream}. Both ends
 * are monitor or group ids.
 */
public record Dependency(String id, String upstream, String downstream, String note) implements ConfigItem {
}
