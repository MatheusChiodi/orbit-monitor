package io.orbit.monitor.definition;

/** Monitor types: HTTP requests, SQL SELECTs and the simple checks (TCP port, ping, push). */
public enum MonitorKind {
    HTTP,
    SQL,
    TCP,
    PING,
    PUSH
}
