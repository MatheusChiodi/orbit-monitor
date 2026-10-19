package io.orbit.alerting.suppression;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.ZonedDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-31 cron expressions for recurring maintenance")
class CronExpressionTest {

    private static ZonedDateTime at(String iso) {
        return ZonedDateTime.parse(iso);
    }

    @Test
    @DisplayName("lists, ranges, steps and day names")
    void fields() {
        CronExpression weekdaysEvery15 = CronExpression.parse("*/15 8-18 * * MON-FRI");
        assertThat(weekdaysEvery15.matches(at("2026-10-19T09:30:00Z"))).isTrue();
        assertThat(weekdaysEvery15.matches(at("2026-10-19T09:31:00Z"))).isFalse();
        assertThat(weekdaysEvery15.matches(at("2026-10-18T09:30:00Z"))).isFalse(); // Sunday

        CronExpression monthly = CronExpression.parse("0 3 1,15 * *");
        assertThat(monthly.matches(at("2026-10-15T03:00:00Z"))).isTrue();
        assertThat(monthly.matches(at("2026-10-16T03:00:00Z"))).isFalse();
    }

    @Test
    @DisplayName("Sunday may be written as 0, 7 or SUN")
    void sunday() {
        ZonedDateTime sunday = at("2026-10-18T02:00:00Z");
        assertThat(CronExpression.parse("0 2 * * 0").matches(sunday)).isTrue();
        assertThat(CronExpression.parse("0 2 * * 7").matches(sunday)).isTrue();
        assertThat(CronExpression.parse("0 2 * * SUN").matches(sunday)).isTrue();
    }

    @Test
    @DisplayName("malformed expressions are rejected")
    void invalid() {
        assertThatThrownBy(() -> CronExpression.parse("0 2 * *")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> CronExpression.parse("61 2 * * *")).isInstanceOf(IllegalArgumentException.class);
    }
}
