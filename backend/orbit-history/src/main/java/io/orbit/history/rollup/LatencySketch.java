package io.orbit.history.rollup;

import io.orbit.history.codec.ByteSink;
import io.orbit.history.codec.Varint;

import java.nio.ByteBuffer;
import java.util.Map;
import java.util.TreeMap;

/**
 * Mergeable latency quantile sketch with a 1% relative-error guarantee, using the DDSketch
 * logarithmic bucketing (Masson et al., VLDB 2019). Sparse bins are serialized as delta varints:
 * about 60–110 bytes for an hour of checks. Deterministic, so merged sketches equal a single one.
 */
public final class LatencySketch {

    static final double RELATIVE_ACCURACY = 0.01;
    private static final double GAMMA = (1 + RELATIVE_ACCURACY) / (1 - RELATIVE_ACCURACY);
    private static final double LOG_GAMMA = Math.log(GAMMA);

    private final TreeMap<Integer, Long> bins = new TreeMap<>();
    private long zeros;
    private long count;

    public void add(long latencyMs) {
        count++;
        if (latencyMs <= 0) {
            zeros++;
            return;
        }
        bins.merge((int) Math.ceil(Math.log(latencyMs) / LOG_GAMMA), 1L, Long::sum);
    }

    public void merge(LatencySketch other) {
        count += other.count;
        zeros += other.zeros;
        other.bins.forEach((index, n) -> bins.merge(index, n, Long::sum));
    }

    public long count() {
        return count;
    }

    /** The q-quantile (0..1) of the added latencies, or NaN when empty. */
    public double quantile(double q) {
        if (count == 0) {
            return Double.NaN;
        }
        long rank = (long) Math.ceil(q * count) - 1;
        long seen = zeros;
        if (rank < seen) {
            return 0;
        }
        for (Map.Entry<Integer, Long> bin : bins.entrySet()) {
            seen += bin.getValue();
            if (rank < seen) {
                return Math.round(2 * Math.pow(GAMMA, bin.getKey()) / (GAMMA + 1));
            }
        }
        return Math.round(2 * Math.pow(GAMMA, bins.lastKey()) / (GAMMA + 1));
    }

    public void write(ByteSink out) {
        Varint.writeUnsigned(out, zeros);
        Varint.writeUnsigned(out, bins.size());
        int previous = 0;
        for (Map.Entry<Integer, Long> bin : bins.entrySet()) {
            Varint.writeSigned(out, bin.getKey() - previous);
            Varint.writeUnsigned(out, bin.getValue());
            previous = bin.getKey();
        }
    }

    /** Advances past a serialized sketch without materializing it. */
    public static void skip(ByteBuffer in) {
        Varint.readUnsigned(in);
        long bins = Varint.readUnsigned(in);
        for (long i = 0; i < bins * 2; i++) {
            Varint.readUnsigned(in);
        }
    }

    public static LatencySketch read(ByteBuffer in) {
        LatencySketch sketch = new LatencySketch();
        sketch.zeros = Varint.readUnsigned(in);
        sketch.count = sketch.zeros;
        int n = Varint.readInt(in);
        int index = 0;
        for (int i = 0; i < n; i++) {
            index += (int) Varint.readSigned(in);
            long c = Varint.readUnsigned(in);
            sketch.bins.put(index, c);
            sketch.count += c;
        }
        return sketch;
    }
}
