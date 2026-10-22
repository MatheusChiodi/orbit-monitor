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

    private final HealthClient client;

    public GrpcHealthProbe(HealthClient client) {
        this.client = client;
    }

    /** @param service empty string asks for the overall server health, as the protocol defines */
    public Result check(String target, String service, Duration timeout) {
        String svc = service == null ? "" : service;
        long start = System.nanoTime();
        try {
            ServingStatus status = client.check(target, svc, timeout);
            long ms = elapsedMs(start);
            if (status == ServingStatus.SERVING) {
                return new Result(MonitorState.OK, status, ms, null);
            }
            ServingStatus reported = status == null ? ServingStatus.UNKNOWN : status;
            return new Result(MonitorState.DOWN, reported, ms, reason(reported, svc));
        } catch (Exception e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            String detail = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            return new Result(MonitorState.DOWN, ServingStatus.UNKNOWN, elapsedMs(start),
                    "Health check failed: " + detail);
        }
    }

    private static String reason(ServingStatus status, String service) {
        String name = service.isEmpty() ? "Server" : "Service '" + service + "'";
        return switch (status) {
            case NOT_SERVING -> name + " is NOT_SERVING";
            case SERVICE_UNKNOWN -> name + " is unknown to the server (SERVICE_UNKNOWN)";
            default -> name + " reported " + status;
        };
    }

    private static long elapsedMs(long start) {
        return Duration.ofNanos(System.nanoTime() - start).toMillis();
    }
}
