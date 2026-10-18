package io.orbit.common;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MonitorStateTest {

    @Test
    void severityOrderGoesFromOkToDown() {
        assertThat(MonitorState.DOWN.isWorseThan(MonitorState.WARN)).isTrue();
        assertThat(MonitorState.WARN.isWorseThan(MonitorState.UNKNOWN)).isTrue();
        assertThat(MonitorState.UNKNOWN.isWorseThan(MonitorState.OK)).isTrue();
        assertThat(MonitorState.OK.isWorseThan(MonitorState.OK)).isFalse();
    }

    @Test
    void worstReturnsTheWorseState() {
        assertThat(MonitorState.worst(MonitorState.OK, MonitorState.WARN)).isEqualTo(MonitorState.WARN);
        assertThat(MonitorState.worst(MonitorState.DOWN, MonitorState.WARN)).isEqualTo(MonitorState.DOWN);
    }

    @Test
    void worstOfEmptyCollectionIsUnknown() {
        assertThat(MonitorState.worstOf(List.of())).isEqualTo(MonitorState.UNKNOWN);
        assertThat(MonitorState.worstOf(List.of(MonitorState.OK, MonitorState.DOWN, MonitorState.WARN)))
                .isEqualTo(MonitorState.DOWN);
    }
}
