package io.orbit.probe.http;

/** Target rejected by SSRF protection (private range, cloud metadata, invalid scheme...). */
public class SsrfBlockedException extends RuntimeException {

    public SsrfBlockedException(String message) {
        super(message);
    }
}
