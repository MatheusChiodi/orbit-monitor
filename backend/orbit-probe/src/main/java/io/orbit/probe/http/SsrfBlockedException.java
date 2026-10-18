package io.orbit.probe.http;

/** Destino recusado pelo anti-SSRF (faixa privada, metadata de nuvem, esquema inválido...). */
public class SsrfBlockedException extends RuntimeException {

    public SsrfBlockedException(String message) {
        super(message);
    }
}
