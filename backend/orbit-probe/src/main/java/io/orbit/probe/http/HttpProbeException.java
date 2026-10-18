package io.orbit.probe.http;

/** Network failure during an HTTP check (timeout, connection refused, TLS...). */
public class HttpProbeException extends RuntimeException {

    public HttpProbeException(String message, Throwable cause) {
        super(message, cause);
    }
}
