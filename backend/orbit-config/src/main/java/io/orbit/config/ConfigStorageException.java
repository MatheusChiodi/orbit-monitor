package io.orbit.config;

/** I/O failure while writing a configuration file. */
public class ConfigStorageException extends RuntimeException {

    public ConfigStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
