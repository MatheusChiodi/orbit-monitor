package io.orbit.probe;

import io.orbit.common.MonitorState;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.monitor.condition.Condition;
import io.orbit.monitor.condition.ConditionEngine;
import io.orbit.monitor.condition.ConditionParser;
import io.orbit.monitor.condition.Severity;
import io.orbit.monitor.http.HttpResponseSnapshot;
import io.orbit.monitor.privacy.PayloadRedactor;
import io.orbit.probe.http.HttpProbe;
import io.orbit.probe.http.HttpProbeRequest;
import io.orbit.probe.multistep.MultiStepHttpProbe;
import io.orbit.probe.sql.SqlProbe;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("CheckRunner: measured checks (DNS, cert, gRPC, Kafka), metrics (BE-23) and multi-step HTTP (BE-07)")
class CheckRunnerExtendedTest {

    private static final Instant NOW = Instant.parse("2026-10-22T12:00:00Z");
    private static final String TEST_PAN = "4111111111111111";
    private final HttpProbe httpProbe = mock(HttpProbe.class);
    private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
    private final CheckRunner runner = new CheckRunner(httpProbe, mock(SqlProbe.class), new ConditionEngine(clock),
            new PayloadRedactor(new SensitiveDataRedactor()), clock);
    private final ConditionParser parser = new ConditionParser();

    private List<Condition> conditions(String... expressions) {
        return Arrays.stream(expressions).map(e -> parser.parse(e, Severity.WARN)).toList();
    }

    @Test
    @DisplayName("conditions see [CERT_DAYS_LEFT], [COL].name and [RESPONSE_TIME]; the base state is never improved")
    void measured() {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("CERT_DAYS_LEFT", 20L);
        values.put("LAG", 1_500L);
        CheckResult result = runner.runMeasured("m1", new CheckRunner.Measurement(MonitorState.WARN, 42, null,
                        "Certificate expires in 20 days", values),
                conditions("[CERT_DAYS_LEFT] > 10", "[COL].LAG < 1000", "[RESPONSE_TIME] < 1s"), CheckPolicy.initial());

        assertThat(result.state()).isEqualTo(MonitorState.WARN);
        assertThat(result.conditions()).extracting(c -> c.passed()).containsExactly(true, false, true);
        assertThat(result.error()).isEqualTo("Certificate expires in 20 days");
        assertThat(result.metrics()).containsEntry("CERT_DAYS_LEFT", 20.0).containsEntry("LAG", 1_500.0);
        assertThat(result.payload()).isInstanceOf(Map.class);
    }

    @Test
    @DisplayName("an OK measurement with passing conditions is OK without error; text values are masked")
    void okAndMasked() {
        CheckResult result = runner.runMeasured("dns", new CheckRunner.Measurement(MonitorState.OK, 5, null, null,
                Map.of("ANSWERS", "card " + TEST_PAN)), List.of(), CheckPolicy.initial());

        assertThat(result.state()).isEqualTo(MonitorState.OK);
        assertThat(result.error()).isNull();
        assertThat(String.valueOf(result.payload())).doesNotContain(TEST_PAN).contains("1111");
    }

    @Test
    @DisplayName("a failed measurement is DOWN with the masked reason")
    void failed() {
        CheckResult result = runner.runMeasured("k", new CheckRunner.Measurement(MonitorState.DOWN, 3,
                "Offsets unavailable: timeout", null, Map.of()), List.of(), CheckPolicy.initial());
        assertThat(result.state()).isEqualTo(MonitorState.DOWN);
        assertThat(result.error()).isEqualTo("Offsets unavailable: timeout");
    }

    @Test
    @DisplayName("BE-23: numeric JSON values at the requested paths become metrics; card fields never do")
    void httpMetrics() {
        when(httpProbe.execute(any())).thenReturn(new HttpResponseSnapshot(200, 30,
                "{\"queue\":{\"size\":17},\"card_number\":\"" + TEST_PAN + "\"}", Map.of(), null));
        CheckResult result = runner.runHttp("h", new HttpProbeRequest("GET", URI.create("https://x.example/"),
                Map.of(), null, Duration.ofSeconds(1), true), List.of(), CheckPolicy.initial(),
                List.of("$.queue.size", "$.card_number"));

        assertThat(result.metrics()).containsExactly(Map.entry("$.queue.size", 17.0));
    }

    @Test
    @DisplayName("BE-07: steps run in order, the last response is evaluated and the time is the sum")
    void multiStep() {
        when(httpProbe.execute(argThat(r -> r != null && r.uri().getPath().equals("/login"))))
                .thenReturn(new HttpResponseSnapshot(200, 10, "{\"token\":\"t-1\"}", Map.of(), null));
        when(httpProbe.execute(argThat(r -> r != null && r.uri().getPath().equals("/orders"))))
                .thenReturn(new HttpResponseSnapshot(200, 25, "{\"count\":3}", Map.of(), null));
        List<MultiStepHttpProbe.Step> steps = List.of(
                new MultiStepHttpProbe.Step("login", "POST", "https://api.example/login", Map.of(), "{}",
                        Map.of("token", "$.token")),
                new MultiStepHttpProbe.Step("main", "GET", "https://api.example/orders",
                        Map.of("Authorization", "Bearer ${login.token}"), null, Map.of()));

        CheckResult result = runner.runSteps("h", new MultiStepHttpProbe(httpProbe), steps,
                conditions("[STATUS] == 200", "[BODY].count > 5"), CheckPolicy.initial(), List.of("$.count"));

        assertThat(result.latencyMs()).isEqualTo(35);
        assertThat(result.state()).isEqualTo(MonitorState.WARN);
        assertThat(result.metrics()).containsEntry("$.count", 3.0);
    }

    @Test
    @DisplayName("BE-07: a failing step is DOWN and names the step, never an extracted value")
    void multiStepFailure() {
        when(httpProbe.execute(any())).thenReturn(new HttpResponseSnapshot(401, 10, "{}", Map.of(), null));
        List<MultiStepHttpProbe.Step> steps = List.of(new MultiStepHttpProbe.Step("login", "POST",
                "https://api.example/login", Map.of(), "{}", Map.of("token", "$.token")));

        CheckResult result = runner.runSteps("h", new MultiStepHttpProbe(httpProbe), steps, List.of(),
                CheckPolicy.initial(), List.of());

        assertThat(result.state()).isEqualTo(MonitorState.DOWN);
        assertThat(result.error()).contains("login");
    }
}
