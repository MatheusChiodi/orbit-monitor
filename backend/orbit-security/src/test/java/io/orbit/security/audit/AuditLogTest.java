package io.orbit.security.audit;

import io.orbit.common.privacy.SensitiveDataRedactor;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AuditLogTest {

    private static final Instant T0 = Instant.parse("2026-10-18T12:00:00Z");
    // Public test card number (never a real card).
    private static final String TEST_PAN = "4111111111111111";

    private final List<String> lines = new ArrayList<>();

    private AuditLog log(Instant now) {
        return new AuditLog(new SensitiveDataRedactor(), Clock.fixed(now, ZoneOffset.UTC), Duration.ofHours(24),
                lines::add);
    }

    @Test
    void recordsWhoWhatWhenWithMaskedDetail() {
        AuditLog audit = log(T0);

        AuditEntry entry = audit.record("  Ana ", "select.update", "sel_queue",
                "SELECT * FROM t WHERE pan = '" + TEST_PAN + "'", "127.0.0.1");

        assertThat(entry.operator()).isEqualTo("Ana");
        assertThat(entry.at()).isEqualTo(T0);
        assertThat(entry.detail()).doesNotContain(TEST_PAN).contains("1111");
        assertThat(audit.recent()).containsExactly(entry);
    }

    @Test
    void writesOneMaskedJsonLinePerEntry() {
        log(T0).record("Ana", "connection.create", "con_core", "password=hunter2 card " + TEST_PAN, "127.0.0.1");

        assertThat(lines).hasSize(1);
        assertThat(lines.getFirst()).startsWith("{").endsWith("}")
                .contains("\"action\":\"connection.create\"", "\"operator\":\"Ana\"")
                .doesNotContain(TEST_PAN);
    }

    @Test
    void anonymousOperatorIsRecordedAsUnknown() {
        assertThat(log(T0).record(null, "group.delete", "grp_x", null, "127.0.0.1").operator()).isEqualTo("unknown");
    }

    @Test
    void filtersByActionAndTarget() {
        AuditLog audit = log(T0);
        audit.record("Ana", "select.update", "sel_a", null, "127.0.0.1");
        audit.record("Bia", "group.update", "grp_a", null, "127.0.0.1");

        assertThat(audit.query(new AuditQuery("select.", null, null))).extracting(AuditEntry::target)
                .containsExactly("sel_a");
        assertThat(audit.query(new AuditQuery(null, "grp_a", null))).extracting(AuditEntry::operator)
                .containsExactly("Bia");
        assertThat(audit.query(new AuditQuery(null, null, "bia"))).hasSize(1);
    }

    @Test
    void entriesOlderThanTheWindowAreDropped() {
        AuditLog audit = new AuditLog(new SensitiveDataRedactor(), new MovingClock(T0), Duration.ofHours(1), l -> { });
        audit.record("Ana", "a", "t", null, "127.0.0.1");
        ((MovingClock) audit.clock()).now = T0.plus(Duration.ofHours(2));
        audit.record("Ana", "b", "t", null, "127.0.0.1");

        assertThat(audit.recent()).extracting(AuditEntry::action).containsExactly("b");
    }

    @Test
    void anonymizeReplacesTheOperatorNameEverywhere() {
        AuditLog audit = log(T0);
        audit.record("Ana", "a", "t", null, "127.0.0.1");
        audit.record("Bia", "b", "t", null, "127.0.0.1");

        int changed = audit.anonymize("Ana");

        assertThat(changed).isEqualTo(1);
        assertThat(audit.recent()).extracting(AuditEntry::operator).containsExactly("Bia", "anonymized");
    }

    static final class MovingClock extends Clock {
        Instant now;

        MovingClock(Instant now) {
            this.now = now;
        }

        @Override
        public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
