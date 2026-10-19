package io.orbit.probe.grpc;

import io.orbit.common.MonitorState;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.concurrent.TimeoutException;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("pending")
@DisplayName("BE-09 gRPC health probe")
class GrpcHealthProbeTest {

    @Test
    @DisplayName("SERVING is OK, NOT_SERVING is DOWN")
    void servingStatus() {
        assertThat(new GrpcHealthProbe((t, s, d) -> GrpcHealthProbe.ServingStatus.SERVING)
                .check("orders:50051", "", Duration.ofSeconds(2)).state()).isEqualTo(MonitorState.OK);
        assertThat(new GrpcHealthProbe((t, s, d) -> GrpcHealthProbe.ServingStatus.NOT_SERVING)
                .check("orders:50051", "orders.v1", Duration.ofSeconds(2)).state()).isEqualTo(MonitorState.DOWN);
    }

    @Test
    @DisplayName("an unknown service is DOWN with the reason")
    void unknownService() {
        GrpcHealthProbe.Result r = new GrpcHealthProbe((t, s, d) -> GrpcHealthProbe.ServingStatus.SERVICE_UNKNOWN)
                .check("orders:50051", "nope", Duration.ofSeconds(2));
        assertThat(r.state()).isEqualTo(MonitorState.DOWN);
        assertThat(r.status()).isEqualTo(GrpcHealthProbe.ServingStatus.SERVICE_UNKNOWN);
    }

    @Test
    @DisplayName("a timeout is DOWN and does not throw")
    void timeout() {
        GrpcHealthProbe.Result r = new GrpcHealthProbe((t, s, d) -> {
            throw new TimeoutException("deadline exceeded");
        }).check("orders:50051", "", Duration.ofMillis(100));
        assertThat(r.state()).isEqualTo(MonitorState.DOWN);
        assertThat(r.error()).contains("deadline");
    }
}
