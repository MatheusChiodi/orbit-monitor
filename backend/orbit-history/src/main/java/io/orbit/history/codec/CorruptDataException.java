package io.orbit.history.codec;

/** A file or block failed validation (checksum, magic, length); the caller quarantines it. */
public class CorruptDataException extends RuntimeException {

    public CorruptDataException(String message) {
        super(message);
    }
}
