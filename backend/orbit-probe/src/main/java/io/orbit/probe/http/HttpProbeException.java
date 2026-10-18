package io.orbit.probe.http;

/** Falha de rede na checagem HTTP (timeout, conexão recusada, TLS...). */
public class HttpProbeException extends RuntimeException {

    public HttpProbeException(String message, Throwable cause) {
        super(message, cause);
    }
}
