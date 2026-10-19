package io.orbit.history.rollup;

import io.orbit.history.segment.Row;

/**
 * Aggregate of one key over one bucket (minute or hour): count, per-state counts, latency
 * min/max/sum/sum of squares, value min/max/sum/sum of squares and, for hourly buckets, a latency
 * sketch for p50/p95/p99. Latency aggregates cover answered checks only (OK and WARN), like the
 * in-memory percentiles. Mutable while it accumulates; merge adds another bucket into this one.
 */
public final class Rollup {

    private final int key;
    private final long start;
    private long count;
    private final long[] states = new long[4];
    private long latencyCount;
    private long latencyMin = Long.MAX_VALUE;
    private long latencyMax;
    private long latencySum;
    private double latencySumSq;
    private long valueCount;
    private double valueMin = Double.NaN;
    private double valueMax = Double.NaN;
    private double valueSum;
    private double valueSumSq;
    private LatencySketch sketch;

    public Rollup(int key, long start, boolean withSketch) {
        this.key = key;
        this.start = start;
        this.sketch = withSketch ? new LatencySketch() : null;
    }

    public void add(Row row) {
        count++;
        states[row.state()]++;
        if (row.hasValue()) {
            addValue(row.value());
        }
        if (row.state() != Row.OK && row.state() != Row.WARN) {
            return;
        }
        long latency = row.latencyMs();
        latencyCount++;
        latencyMin = Math.min(latencyMin, latency);
        latencyMax = Math.max(latencyMax, latency);
        latencySum += latency;
        latencySumSq += (double) latency * latency;
        if (sketch != null) {
            sketch.add(latency);
        }
    }

    public void merge(Rollup other) {
        count += other.count;
        for (int i = 0; i < 4; i++) {
            states[i] += other.states[i];
        }
        latencyCount += other.latencyCount;
        latencyMin = Math.min(latencyMin, other.latencyMin);
        latencyMax = Math.max(latencyMax, other.latencyMax);
        latencySum += other.latencySum;
        latencySumSq += other.latencySumSq;
        if (other.valueCount > 0) {
            valueMin = valueCount == 0 ? other.valueMin : Math.min(valueMin, other.valueMin);
            valueMax = valueCount == 0 ? other.valueMax : Math.max(valueMax, other.valueMax);
            valueCount += other.valueCount;
            valueSum += other.valueSum;
            valueSumSq += other.valueSumSq;
        }
        if (sketch != null && other.sketch != null) {
            sketch.merge(other.sketch);
        }
    }

    private void addValue(double v) {
        valueMin = valueCount == 0 ? v : Math.min(valueMin, v);
        valueMax = valueCount == 0 ? v : Math.max(valueMax, v);
        valueCount++;
        valueSum += v;
        valueSumSq += v * v;
    }

    /** Restores the stored aggregates (used by the codec). */
    void restore(long count, long[] states, long latCount, long latMin, long latMax, long latSum, double latSumSq,
                 long valueCount, double vMin, double vMax, double vSum, double vSumSq, LatencySketch sketch) {
        this.count = count;
        System.arraycopy(states, 0, this.states, 0, 4);
        this.latencyCount = latCount;
        this.latencyMin = latMin;
        this.latencyMax = latMax;
        this.latencySum = latSum;
        this.latencySumSq = latSumSq;
        this.valueCount = valueCount;
        this.valueMin = vMin;
        this.valueMax = vMax;
        this.valueSum = vSum;
        this.valueSumSq = vSumSq;
        this.sketch = sketch;
    }

    public int key() {
        return key;
    }

    public long start() {
        return start;
    }

    public long count() {
        return count;
    }

    public long stateCount(int state) {
        return states[state];
    }

    long[] states() {
        return states;
    }

    /** Checks that answered (OK or WARN); the latency aggregates cover only these. */
    public long latencyCount() {
        return latencyCount;
    }

    public long latencyMin() {
        return latencyCount == 0 ? 0 : latencyMin;
    }

    public long latencyMax() {
        return latencyMax;
    }

    public long latencySum() {
        return latencySum;
    }

    double latencySumSq() {
        return latencySumSq;
    }

    public double latencyMean() {
        return latencyCount == 0 ? Double.NaN : (double) latencySum / latencyCount;
    }

    /** Population standard deviation of the latency. */
    public double latencyStdDev() {
        if (latencyCount == 0) {
            return Double.NaN;
        }
        double mean = latencyMean();
        return Math.sqrt(Math.max(0, latencySumSq / latencyCount - mean * mean));
    }

    public long valueCount() {
        return valueCount;
    }

    public double valueMin() {
        return valueMin;
    }

    public double valueMax() {
        return valueMax;
    }

    double valueSum() {
        return valueSum;
    }

    double valueSumSq() {
        return valueSumSq;
    }

    public double valueMean() {
        return valueCount == 0 ? Double.NaN : valueSum / valueCount;
    }

    /** Latency sketch (hourly rollups only), or null. */
    public LatencySketch sketch() {
        return sketch;
    }
}
