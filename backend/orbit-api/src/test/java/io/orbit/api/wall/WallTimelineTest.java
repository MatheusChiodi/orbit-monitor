package io.orbit.api.wall;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class WallTimelineTest {

    private static final Instant T0 = Instant.parse("2026-10-18T12:00:00Z");

    @Test
    void keepsNewestFirstWithIds() {
        WallTimeline timeline = new WallTimeline(10, Duration.ofHours(24));
        timeline.add("DOWN", "Queue is down", "QTY = 347 · rule QTY < 200", T0);
        timeline.add("OK", "Queue recovered", "", T0.plusSeconds(60));

        assertThat(timeline.recent()).extracting(WallViews.TimelineEventView::kind).containsExactly("OK", "DOWN");
        assertThat(timeline.recent()).extracting(WallViews.TimelineEventView::id).doesNotHaveDuplicates();
        assertThat(timeline.lastRecoveryAt()).contains(T0.plusSeconds(60));
    }

    @Test
    void isBoundedByCountAndAge() {
        WallTimeline timeline = new WallTimeline(2, Duration.ofHours(1));
        timeline.add("INFO", "a", "", T0);
        timeline.add("INFO", "b", "", T0.plusSeconds(10));
        timeline.add("INFO", "c", "", T0.plusSeconds(20));
        assertThat(timeline.recent()).extracting(WallViews.TimelineEventView::title).containsExactly("c", "b");

        timeline.add("INFO", "d", "", T0.plus(Duration.ofHours(2)));
        assertThat(timeline.recent()).extracting(WallViews.TimelineEventView::title).containsExactly("d");
    }

    @Test
    void noRecoveryYet() {
        assertThat(new WallTimeline(5, Duration.ofHours(1)).lastRecoveryAt()).isEmpty();
    }
}
