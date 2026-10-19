package io.orbit.alerting.suppression;

import java.time.ZonedDateTime;
import java.util.BitSet;
import java.util.Locale;
import java.util.Map;

/**
 * Minimal 5-field cron ({@code minute hour day-of-month month day-of-week}) for recurring
 * maintenance windows: {@code *}, numbers, lists, ranges, steps ({@code *}/15) and day names.
 */
final class CronExpression {

    private static final Map<String, String> DAYS = Map.of("SUN", "0", "MON", "1", "TUE", "2", "WED", "3",
            "THU", "4", "FRI", "5", "SAT", "6");

    private final BitSet minutes;
    private final BitSet hours;
    private final BitSet daysOfMonth;
    private final BitSet months;
    private final BitSet daysOfWeek;

    private CronExpression(BitSet minutes, BitSet hours, BitSet daysOfMonth, BitSet months, BitSet daysOfWeek) {
        this.minutes = minutes;
        this.hours = hours;
        this.daysOfMonth = daysOfMonth;
        this.months = months;
        this.daysOfWeek = daysOfWeek;
    }

    static CronExpression parse(String expression) {
        String[] f = expression.trim().toUpperCase(Locale.ROOT).split("\\s+");
        if (f.length != 5) {
            throw new IllegalArgumentException("Cron needs 5 fields: " + expression);
        }
        String dow = f[4];
        for (Map.Entry<String, String> d : DAYS.entrySet()) {
            dow = dow.replace(d.getKey(), d.getValue());
        }
        return new CronExpression(field(f[0], 0, 59), field(f[1], 0, 23), field(f[2], 1, 31), field(f[3], 1, 12),
                field(dow.replace("7", "0"), 0, 6));
    }

    boolean matches(ZonedDateTime t) {
        return minutes.get(t.getMinute()) && hours.get(t.getHour()) && daysOfMonth.get(t.getDayOfMonth())
                && months.get(t.getMonthValue()) && daysOfWeek.get(t.getDayOfWeek().getValue() % 7);
    }

    private static BitSet field(String spec, int min, int max) {
        BitSet bits = new BitSet(max + 1);
        for (String part : spec.split(",")) {
            int step = 1;
            String range = part;
            if (part.contains("/")) {
                step = Integer.parseInt(part.substring(part.indexOf('/') + 1));
                range = part.substring(0, part.indexOf('/'));
            }
            int from;
            int to;
            if (range.equals("*")) {
                from = min;
                to = max;
            } else if (range.contains("-")) {
                from = Integer.parseInt(range.substring(0, range.indexOf('-')));
                to = Integer.parseInt(range.substring(range.indexOf('-') + 1));
            } else {
                from = Integer.parseInt(range);
                to = part.contains("/") ? max : from;
            }
            if (from < min || to > max || from > to || step < 1) {
                throw new IllegalArgumentException("Cron field out of range: " + part);
            }
            for (int v = from; v <= to; v += step) {
                bits.set(v);
            }
        }
        return bits;
    }
}
