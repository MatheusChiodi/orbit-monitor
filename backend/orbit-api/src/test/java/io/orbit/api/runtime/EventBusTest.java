package io.orbit.api.runtime;

import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;
import io.orbit.probe.CheckResult;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class EventBusTest {

    private static final Instant NOW = Instant.parse("2026-10-18T12:00:00Z");

    @Test
    void deliversEachEventKindToItsSubscribers() {
        EventBus bus = new EventBus();
        List<Object> received = new ArrayList<>();
        bus.onStateChange(received::add);
        bus.onCheck(received::add);

        var change = new MonitorStateChanged("m", MonitorState.OK, MonitorState.DOWN, NOW, NOW);
        var check = new CheckResult("m", MonitorState.DOWN, 0, null, List.of(), "x", NOW);
        bus.publish(change);
        bus.publish(check);

        assertThat(received).containsExactly(change, check);
    }

    @Test
    void aFailingSubscriberDoesNotStopTheOthers() {
        EventBus bus = new EventBus();
        List<MonitorStateChanged> received = new ArrayList<>();
        bus.onStateChange(e -> {
            throw new IllegalStateException("boom");
        });
        bus.onStateChange(received::add);

        bus.publish(new MonitorStateChanged("m", MonitorState.OK, MonitorState.WARN, NOW, NOW));

        assertThat(received).hasSize(1);
    }
}
