package io.orbit.probe.grpc;

import io.grpc.ManagedChannel;
import io.grpc.Server;
import io.grpc.ServerServiceDefinition;
import io.grpc.Status;
import io.grpc.inprocess.InProcessChannelBuilder;
import io.grpc.inprocess.InProcessServerBuilder;
import io.grpc.stub.ServerCalls;
import io.orbit.probe.http.SsrfBlockedException;
import io.orbit.probe.http.SsrfGuard;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-09 grpc.health.v1 client (grpc-java, hand-encoded messages)")
class GrpcJavaHealthClientTest {

    private static final SsrfGuard GUARD = new SsrfGuard(h -> List.of(InetAddress.getLoopbackAddress()), Set.of());
    private Server server;
    private String name;

    @BeforeEach
    void start() throws Exception {
        name = InProcessServerBuilder.generateName();
        ServerServiceDefinition health = ServerServiceDefinition.builder("grpc.health.v1.Health")
                .addMethod(GrpcJavaHealthClient.CHECK, ServerCalls.asyncUnaryCall((request, response) -> {
                    String service = request.length == 0 ? "" : new String(request, 2, request[1],
                            StandardCharsets.UTF_8);
                    switch (service) {
                        case "" -> response.onNext(new byte[] {0x08, 0x01});
                        case "orders" -> response.onNext(new byte[] {0x08, 0x02});
                        default -> {
                            response.onError(Status.NOT_FOUND.asRuntimeException());
                            return;
                        }
                    }
                    response.onCompleted();
                })).build();
        server = InProcessServerBuilder.forName(name).directExecutor().addService(health).build().start();
    }

    @AfterEach
    void stop() {
        server.shutdownNow();
    }

    private GrpcJavaHealthClient client() {
        return new GrpcJavaHealthClient(GUARD, false,
                (target, tls) -> (ManagedChannel) InProcessChannelBuilder.forName(name).directExecutor().build());
    }

    @Test
    @DisplayName("SERVING, NOT_SERVING and an unknown service (NOT_FOUND) map to the protocol statuses")
    void statuses() throws Exception {
        try (GrpcJavaHealthClient client = client()) {
            assertThat(client.check("localhost:9090", "", Duration.ofSeconds(2)))
                    .isEqualTo(GrpcHealthProbe.ServingStatus.SERVING);
            assertThat(client.check("localhost:9090", "orders", Duration.ofSeconds(2)))
                    .isEqualTo(GrpcHealthProbe.ServingStatus.NOT_SERVING);
            assertThat(client.check("localhost:9090", "missing", Duration.ofSeconds(2)))
                    .isEqualTo(GrpcHealthProbe.ServingStatus.SERVICE_UNKNOWN);
        }
    }

    @Test
    @DisplayName("request and response are encoded by hand: field 1 string / field 1 enum")
    void codec() {
        assertThat(GrpcJavaHealthClient.encodeRequest("")).isEmpty();
        assertThat(GrpcJavaHealthClient.encodeRequest("ab")).containsExactly(0x0A, 0x02, 'a', 'b');
        assertThat(GrpcJavaHealthClient.decodeStatus(new byte[] {0x08, 0x03}))
                .isEqualTo(GrpcHealthProbe.ServingStatus.SERVICE_UNKNOWN);
        assertThat(GrpcJavaHealthClient.decodeStatus(new byte[] {0x12, 0x01, 'x', 0x08, 0x01}))
                .isEqualTo(GrpcHealthProbe.ServingStatus.SERVING);
        assertThat(GrpcJavaHealthClient.decodeStatus(new byte[0])).isEqualTo(GrpcHealthProbe.ServingStatus.UNKNOWN);
    }

    @Test
    @DisplayName("the target host passes the SSRF guard first")
    void guarded() {
        SsrfGuard metadata = new SsrfGuard(h -> List.of(InetAddress.getByName("169.254.169.254")), Set.of());
        GrpcJavaHealthClient client = new GrpcJavaHealthClient(metadata, false, (t, tls) -> null);
        assertThatThrownBy(() -> client.check("meta:80", "", Duration.ofSeconds(1)))
                .isInstanceOf(SsrfBlockedException.class);
    }
}
