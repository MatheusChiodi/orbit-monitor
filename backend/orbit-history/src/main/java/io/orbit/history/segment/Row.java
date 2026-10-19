package io.orbit.history.segment;

/**
 * One stored sample in its compact form: dictionary key, epoch millis, state ordinal, latency,
 * value ({@code NaN} when absent) and error code (dictionary index, 0 = none).
 */
public record Row(int key, long at, int state, int latencyMs, double value, int error) {

    public static final int OK = 0;
    public static final int UNKNOWN = 1;
    public static final int WARN = 2;
    public static final int DOWN = 3;

    public boolean hasValue() {
        return !Double.isNaN(value);
    }
}
