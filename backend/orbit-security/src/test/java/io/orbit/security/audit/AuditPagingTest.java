package io.orbit.security.audit;

import io.orbit.common.privacy.SensitiveDataRedactor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-46 audit query: time range, operator/action filters and pagination")
class AuditPagingTest {

    private static final Instant T0 = Instant.parse("2026-10-18T12:00:00Z");

    /** A clock the test moves forward. */
    private static final class MovingClock extends Clock {
        private Instant now = T0;

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    private AuditLog withTenEntries(MovingClock clock) {
        AuditLog audit = new AuditLog(new SensitiveDataRedactor(), clock, Duration.ofHours(24), line -> { });
        for (int i = 0; i < 10; i++) {
            clock.now = T0.plus(Duration.ofMinutes(i));
            audit.record(i % 2 == 0 ? "Ana" : "Bia", i < 5 ? "group.save" : "select.update", "t" + i, null, "127.0.0.1");
        }
        return audit;
    }

    @Test
    @DisplayName("pages are newest first with the total of matching entries")
    void pages() {
        AuditLog audit = withTenEntries(new MovingClock());

        AuditLog.Page first = audit.page(AuditQuery.all(), 0, 4);
        AuditLog.Page last = audit.page(AuditQuery.all(), 8, 4);

        assertThat(first.total()).isEqualTo(10);
        assertThat(first.items()).extracting(AuditEntry::target).containsExactly("t9", "t8", "t7", "t6");
        assertThat(last.items()).extracting(AuditEntry::target).containsExactly("t1", "t0");
    }

    @Test
    @DisplayName("from is inclusive, to is exclusive; filters combine")
    void timeRange() {
        AuditLog audit = withTenEntries(new MovingClock());

        AuditQuery range = new AuditQuery("select.", null, "ana", T0.plus(Duration.ofMinutes(5)),
                T0.plus(Duration.ofMinutes(9)));
        assertThat(audit.page(range, 0, 50).items()).extracting(AuditEntry::target).containsExactly("t8", "t6");
        assertThat(audit.query(new AuditQuery(null, null, null, null, T0.plus(Duration.ofMinutes(2)))))
                .extracting(AuditEntry::target).containsExactly("t1", "t0");
    }

    @Test
    @DisplayName("limits are bounded")
    void bounds() {
        AuditLog audit = withTenEntries(new MovingClock());
        assertThat(audit.page(AuditQuery.all(), 0, 10_000).items()).hasSize(10);
        assertThatThrownBy(() -> audit.page(AuditQuery.all(), -1, 10)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> audit.page(AuditQuery.all(), 0, 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new AuditQuery(null, null, null, T0, T0.minusSeconds(1)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
