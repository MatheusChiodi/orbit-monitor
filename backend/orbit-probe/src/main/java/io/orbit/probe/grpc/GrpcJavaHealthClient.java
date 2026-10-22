package io.orbit.probe.grpc;

import io.grpc.CallOptions;
import io.grpc.ManagedChannel;
import io.grpc.MethodDescriptor;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import io.grpc.okhttp.OkHttpChannelBuilder;
import io.grpc.stub.ClientCalls;
import io.orbit.probe.http.SsrfGuard;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.function.BiFunction;

/**
 * BE-09 production client: calls {@code grpc.health.v1.Health/Check} with grpc-java over the OkHttp
 * transport (client only, no Netty). The two messages have one field each, so they are encoded by
 * hand and no protobuf runtime or generated stubs are needed. One channel per target is kept open.
 */
public class GrpcJavaHealthClient implements GrpcHealthProbe.HealthClient, AutoCloseable {

    static final MethodDescriptor<byte[], byte[]> CHECK = MethodDescriptor.<byte[], byte[]>newBuilder()
            .setType(MethodDescriptor.MethodType.UNARY)
            .setFullMethodName("grpc.health.v1.Health/Check")
            .setRequestMarshaller(new Bytes())
            .setResponseMarshaller(new Bytes())
            .build();
    private static final int MAX_RESPONSE_BYTES = 4_096;

    private final SsrfGuard guard;
    private final boolean tls;
    private final BiFunction<String, Boolean, ManagedChannel> channels;
    private final Map<String, ManagedChannel> open = new ConcurrentHashMap<>();

    public GrpcJavaHealthClient(SsrfGuard guard, boolean tls) {
        this(guard, tls, GrpcJavaHealthClient::okHttpChannel);
    }

    GrpcJavaHealthClient(SsrfGuard guard, boolean tls, BiFunction<String, Boolean, ManagedChannel> channels) {
        this.guard = guard;
        this.tls = tls;
        this.channels = channels;
    }

    /** @param target {@code host:port} */
    @Override
    public GrpcHealthProbe.ServingStatus check(String target, String service, Duration timeout) {
        guard.check(URI.create((tls ? "https://" : "http://") + target));
        ManagedChannel channel = open.computeIfAbsent(target, t -> channels.apply(t, tls));
        try {
            byte[] response = ClientCalls.blockingUnaryCall(channel, CHECK,
                    CallOptions.DEFAULT.withDeadlineAfter(timeout.toMillis(), TimeUnit.MILLISECONDS),
                    encodeRequest(service));
            return decodeStatus(response);
        } catch (StatusRuntimeException e) {
            if (e.getStatus().getCode() == Status.Code.NOT_FOUND) {
                return GrpcHealthProbe.ServingStatus.SERVICE_UNKNOWN;
            }
            if (e.getStatus().getCode() == Status.Code.UNIMPLEMENTED) {
                throw new IllegalStateException("The server does not implement grpc.health.v1", e);
            }
            throw new IllegalStateException(e.getStatus().getCode() + (e.getStatus().getDescription() == null ? ""
                    : ": " + e.getStatus().getDescription()), e);
        }
    }

    /** HealthCheckRequest { string service = 1; } */
    static byte[] encodeRequest(String service) {
        if (service == null || service.isEmpty()) {
            return new byte[0];
        }
        byte[] text = service.getBytes(StandardCharsets.UTF_8);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(0x0A);
        writeVarint(out, text.length);
        out.writeBytes(text);
        return out.toByteArray();
    }

    /** HealthCheckResponse { ServingStatus status = 1; }; unknown fields are skipped. */
    static GrpcHealthProbe.ServingStatus decodeStatus(byte[] message) {
        int[] pos = {0};
        long status = 0;
        while (pos[0] < message.length) {
            long tag = readVarint(message, pos);
            int field = (int) (tag >>> 3);
            int wire = (int) (tag & 7);
            switch (wire) {
                case 0 -> {
                    long value = readVarint(message, pos);
                    if (field == 1) {
                        status = value;
                    }
                }
                case 1 -> pos[0] += 8;
                case 2 -> {
                    int length = (int) readVarint(message, pos);
                    pos[0] += length;
                }
                case 5 -> pos[0] += 4;
                default -> throw new IllegalStateException("Malformed health response");
            }
        }
        return switch ((int) status) {
            case 1 -> GrpcHealthProbe.ServingStatus.SERVING;
            case 2 -> GrpcHealthProbe.ServingStatus.NOT_SERVING;
            case 3 -> GrpcHealthProbe.ServingStatus.SERVICE_UNKNOWN;
            default -> GrpcHealthProbe.ServingStatus.UNKNOWN;
        };
    }

    private static void writeVarint(ByteArrayOutputStream out, int value) {
        int v = value;
        while ((v & ~0x7F) != 0) {
            out.write((v & 0x7F) | 0x80);
            v >>>= 7;
        }
        out.write(v);
    }

    private static long readVarint(byte[] data, int[] pos) {
        long result = 0;
        for (int shift = 0; shift < 64; shift += 7) {
            if (pos[0] >= data.length) {
                throw new IllegalStateException("Malformed health response");
            }
            byte b = data[pos[0]++];
            result |= (long) (b & 0x7F) << shift;
            if ((b & 0x80) == 0) {
                return result;
            }
        }
        throw new IllegalStateException("Malformed health response");
    }

    private static ManagedChannel okHttpChannel(String target, boolean tls) {
        OkHttpChannelBuilder builder = OkHttpChannelBuilder.forTarget(target).maxInboundMessageSize(MAX_RESPONSE_BYTES)
                .userAgent("orbit-monitor");
        return (tls ? builder.useTransportSecurity() : builder.usePlaintext()).build();
    }

    /** Closes channels of targets no longer monitored. */
    public void forget(String target) {
        ManagedChannel channel = open.remove(target);
        if (channel != null) {
            channel.shutdownNow();
        }
    }

    @Override
    public void close() {
        open.values().forEach(ManagedChannel::shutdownNow);
        open.clear();
    }

    /** Raw message bytes; the health messages are tiny, so a full read is fine. */
    private static final class Bytes implements MethodDescriptor.Marshaller<byte[]> {

        @Override
        public InputStream stream(byte[] value) {
            return new ByteArrayInputStream(value);
        }

        @Override
        public byte[] parse(InputStream stream) {
            try {
                return stream.readNBytes(MAX_RESPONSE_BYTES);
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        }
    }
}
