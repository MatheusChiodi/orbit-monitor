package io.orbit.config;

/** Every configuration item has a stable id used for cross-file references. */
public interface ConfigItem {

    String id();
}
