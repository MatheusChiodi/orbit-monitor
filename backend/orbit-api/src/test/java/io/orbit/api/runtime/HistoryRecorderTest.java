package io.orbit.api.runtime;

import io.orbit.common.MonitorState;
import io.orbit.config.ConfigMapper;
import io.orbit.history.HistoryEvent;
import io.orbit.history.HistorySample;
import io.orbit.history.HistorySettings;
import io.orbit.history.store.HistoryStore;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.probe.CheckResult;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-19/BE-52: series points and notices reach the 30-day history")
class HistoryRecorderTest {

    @TempDir
    Path dir;
    private HistoryStore store;
    private final EventBus bus = new EventBus();

    @BeforeEach
    void setUp() throws Exception {
        store = HistoryStore.open(new HistorySettings(dir.resolve("data"), 30, 1024, 0), Clock.systemUTC(), () -> Long.MAX_VALUE);
        new HistoryRecorder(store, MonitorDefinitions.open(dir.resolve("config"), ConfigMapper.create())).subscribe(bus);
    }

    @AfterEach
    void tearDown() throws Exception {
        store.close();
    }

    @Test
    @DisplayName("each metric of a check is stored as a series point under monitorId/metric")
    void series() throws Exception {
        Instant now = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        bus.publish(new CheckResult("req_api", MonitorState.OK, 30, null, List.of(), null, now,
                Map.of("$.queue.size", 17.0)));
        store.flush().get(5, TimeUnit.SECONDS);

        List<HistorySample> points = store.rawSeries(HistorySample.seriesKey("req_api", "$.queue.size"),
                now.minusSeconds(60), now.plusSeconds(60));
        assertThat(points).extracting(HistorySample::value).containsExactly(17.0);
        assertThat(store.raw("req_api", now.minusSeconds(60), now.plusSeconds(60))).hasSize(1);
    }

    @Test
    @DisplayName("a notice becomes a history event with its type")
    void notice() throws Exception {
        Instant now = Instant.now();
        bus.publish(new Notice("cert.warning", "cert_portal", "notice.cert.warning", List.of("Portal", 14L, 14), now));
        store.flush().get(5, TimeUnit.SECONDS);

        assertThat(store.events(now.minusSeconds(60), now.plusSeconds(60), "cert.warning", null, 10))
                .extracting(HistoryEvent::monitorId).containsExactly("cert_portal");
    }
}
