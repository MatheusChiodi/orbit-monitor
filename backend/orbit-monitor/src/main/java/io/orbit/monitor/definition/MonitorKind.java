package io.orbit.monitor.definition;

/**
 * Monitor types: HTTP requests, SQL SELECTs and the checks of orbit.checks.json (TCP port, ping,
 * push, DNS, gRPC health, Kafka consumer lag, certificate and domain expiry).
 */
public enum MonitorKind {
    HTTP,
    SQL,
    TCP,
    PING,
    PUSH,
    DNS,
    GRPC,
    KAFKA,
    CERT
}
