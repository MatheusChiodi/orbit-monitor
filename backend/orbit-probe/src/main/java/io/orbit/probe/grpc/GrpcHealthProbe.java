package io.orbit.probe.grpc;

import io.orbit.common.MonitorState;

import java.time.Duration;

/** BE-09: standard {@code grpc.health.v1.Health/Check} probe. */
public class GrpcHealthProbe {

    /** Serving status as defined by grpc.health.v1. */
    public enum ServingStatus { UNKNOWN, SERVING, NOT_SERVING, SERVICE_UNKNOWN }

    /** Client port so the probe can be tested without a gRPC server. */
    @FunctionalInterface
    public interface HealthClient {
        ServingStatus check(String target, String service, Duration timeout) throws Exception;
    }

    public record Result(MonitorState state, ServingStatus status, long ms, String error) {
    }

    public GrpcHealthProbe(HealthClient client) {
    }

    public Result check(String target, String service, Duration timeout) {
        throw new UnsupportedOperationException("BE-09 gRPC health probe is not implemented yet");
    }
}
