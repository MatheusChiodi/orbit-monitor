package io.orbit.probe;

import io.orbit.common.MonitorState;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.monitor.condition.Condition;
import io.orbit.monitor.condition.ConditionEngine;
import io.orbit.monitor.condition.ConditionParser;
import io.orbit.monitor.condition.Severity;
import io.orbit.monitor.http.HttpResponseSnapshot;
import io.orbit.monitor.privacy.PayloadRedactor;
import io.orbit.monitor.sql.ColumnType;
import io.orbit.monitor.sql.Dialect;
import io.orbit.monitor.sql.ResultColumn;
import io.orbit.monitor.sql.ResultPayload;
import io.orbit.monitor.sql.UnsafeSqlException;
import io.orbit.probe.http.HttpProbe;
import io.orbit.probe.http.HttpProbeException;
import io.orbit.probe.http.HttpProbeRequest;
import io.orbit.probe.http.SsrfBlockedException;
import io.orbit.probe.sql.SqlProbe;
import io.orbit.probe.sql.SqlProbeException;
import io.orbit.probe.sql.SqlProbeOptions;
import org.junit.jupiter.api.Test;

import javax.sql.DataSource;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CheckRunnerTest {

    private static final Instant NOW = Instant.parse("2026-10-18T12:00:00Z");
    // Public test card number (never a real card).
    private static final String TEST_PAN = "4111111111111111";

    private final HttpProbe httpProbe = mock(HttpProbe.class);
    private final SqlProbe sqlProbe = mock(SqlProbe.class);
    private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
    private final CheckRunner runner = new CheckRunner(httpProbe, sqlProbe, new ConditionEngine(clock),
            new PayloadRedactor(new SensitiveDataRedactor()), clock);
    private final ConditionParser parser = new ConditionParser();
    private final HttpProbeRequest request = new HttpProbeRequest("GET", URI.create("https://api.example.com/health"),
            Map.of(), null, Duration.ofSeconds(5), true);
    private final DataSource dataSource = mock(DataSource.class);

    private List<Condition> conditions(String... expressions) {
        return java.util.Arrays.stream(expressions).map(e -> parser.parse(e, Severity.DOWN)).toList();
    }

    @Test
    void httpCheckEvaluatesConditions() {
        when(httpProbe.execute(request)).thenReturn(new HttpResponseSnapshot(500, 120L, "{}", Map.of(), null));

        CheckResult r = runner.runHttp("mon_api", request, conditions("[STATUS] == 200"));

        assertThat(r.monitorId()).isEqualTo("mon_api");
        assertThat(r.state()).isEqualTo(MonitorState.DOWN);
        assertThat(r.latencyMs()).isEqualTo(120L);
        assertThat(r.checkedAt()).isEqualTo(NOW);
        assertThat(r.conditions()).hasSize(1);
        assertThat(r.error()).isNull();
    }

    @Test
    void conditionsSeeRawValuesButResultIsMasked() {
        when(httpProbe.execute(request)).thenReturn(
                new HttpResponseSnapshot(200, 10L, "{\"pan\":\"" + TEST_PAN + "\"}", Map.of(), null));

        CheckResult r = runner.runHttp("mon_api", request, conditions("[BODY].pan == \"" + TEST_PAN + "\""));

        assertThat(r.state()).isEqualTo(MonitorState.OK);
        assertThat(((HttpResponseSnapshot) r.payload()).body()).doesNotContain(TEST_PAN);
        assertThat(r.conditions().getFirst().actual()).isEqualTo("•••• •••• •••• 1111");
    }

    @Test
    void networkFailureIsDownWithError() {
        when(httpProbe.execute(request)).thenThrow(new HttpProbeException("Timed out after 5000 ms", null));

        CheckResult r = runner.runHttp("mon_api", request, conditions("[STATUS] == 200"));

        assertThat(r.state()).isEqualTo(MonitorState.DOWN);
        assertThat(r.error()).contains("Timed out");
        assertThat(r.payload()).isNull();
    }

    @Test
    void ssrfBlockIsDownWithError() {
        when(httpProbe.execute(request)).thenThrow(new SsrfBlockedException("Internal address blocked"));
        assertThat(runner.runHttp("m", request, List.of()).error()).contains("blocked");
    }

    @Test
    void sqlCheckEvaluatesAndMasksRows() {
        var payload = new ResultPayload(
                List.of(new ResultColumn("PENDING_QTY", ColumnType.NUMBER, "NUMBER"),
                        new ResultColumn("CARD_NUMBER", ColumnType.TEXT, "VARCHAR")),
                List.of(List.of(347, TEST_PAN)), 80L, false);
        when(sqlProbe.execute(eq(dataSource), eq(Dialect.ORACLE), anyString(), any())).thenReturn(payload);

        CheckResult r = runner.runSql("sel_queue", dataSource, Dialect.ORACLE, "SELECT ...",
                SqlProbeOptions.defaults(), List.of(parser.parse("[COL].PENDING_QTY < 200", Severity.WARN)));

        assertThat(r.state()).isEqualTo(MonitorState.WARN);
        assertThat(r.latencyMs()).isEqualTo(80L);
        assertThat(((ResultPayload) r.payload()).rows().getFirst()).containsExactly(347, "•••• •••• •••• 1111");
        assertThat(r.conditions().getFirst().message()).contains("347");
    }

    @Test
    void sqlFailuresAreDownWithError() {
        when(sqlProbe.execute(any(), any(), anyString(), any()))
                .thenThrow(new SqlProbeException("Query timed out after 30000 ms", true, null))
                .thenThrow(new UnsafeSqlException("Only SELECT/WITH is allowed"));

        CheckResult timeout = runner.runSql("s", dataSource, Dialect.H2, "SELECT 1", SqlProbeOptions.defaults(), List.of());
        CheckResult unsafe = runner.runSql("s", dataSource, Dialect.H2, "DELETE", SqlProbeOptions.defaults(), List.of());

        assertThat(timeout.state()).isEqualTo(MonitorState.DOWN);
        assertThat(timeout.error()).contains("timed out");
        assertThat(unsafe.error()).contains("Only SELECT");
    }

    @Test
    void previousUnhealthyStateAppliesHysteresis() {
        var payload = new ResultPayload(List.of(new ResultColumn("QTY", ColumnType.NUMBER, "NUMBER")),
                List.of(List.of(190)), 5L, false);
        when(sqlProbe.execute(any(), any(), anyString(), any())).thenReturn(payload);
        var conds = List.of(parser.parse("[COL].QTY < 200", Severity.WARN));

        CheckResult fromOk = runner.runSql("s", dataSource, Dialect.H2, "SELECT 1", SqlProbeOptions.defaults(), conds,
                new CheckPolicy(MonitorState.OK, 0.10));
        CheckResult fromWarn = runner.runSql("s", dataSource, Dialect.H2, "SELECT 1", SqlProbeOptions.defaults(), conds,
                new CheckPolicy(MonitorState.WARN, 0.10));

        assertThat(fromOk.state()).isEqualTo(MonitorState.OK);
        assertThat(fromWarn.state()).isEqualTo(MonitorState.WARN);
    }

    @Test
    void checkThatCannotStartIsDown() {
        CheckResult r = runner.failed("m", "Environment variable not set: X");
        assertThat(r.state()).isEqualTo(MonitorState.DOWN);
        assertThat(r.error()).contains("not set");
        assertThat(r.checkedAt()).isEqualTo(NOW);
    }

    @Test
    void errorMessagesAreRedacted() {
        when(httpProbe.execute(request)).thenThrow(new HttpProbeException("Connection failed: " + TEST_PAN, null));
        assertThat(runner.runHttp("m", request, List.of()).error()).doesNotContain(TEST_PAN);
    }
}
