package io.orbit.api.wall;

import io.orbit.api.runtime.Notice;
import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;
import io.orbit.monitor.definition.MonitorDefinitions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.support.ResourceBundleMessageSource;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

@DisplayName("CORE-15: wall timeline titles in the workspace language; BE-05 notices on the timeline")
class WallPublisherI18nTest {

    private static final Instant NOW = Instant.parse("2026-10-22T12:00:00Z");
    private final WallSocketHandler socket = mock(WallSocketHandler.class);
    private final WallTimeline timeline = new WallTimeline(50, Duration.ofHours(24));
    private final AtomicReference<Locale> locale = new AtomicReference<>(Locale.forLanguageTag("pt-BR"));

    private WallPublisher publisher() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasename("messages");
        source.setDefaultEncoding("UTF-8");
        source.setFallbackToSystemLocale(false);
        return new WallPublisher(socket, mock(WallViewFactory.class), timeline, mock(MonitorDefinitions.class),
                WallTitles.of(source, locale::get));
    }

    private WallViews.TimelineEventView lastEvent() {
        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(socket, org.mockito.Mockito.atLeastOnce()).broadcast(eq("event"), payload.capture());
        return (WallViews.TimelineEventView) payload.getValue();
    }

    @Test
    @DisplayName("titles follow the workspace locale (pt-BR) and switch at once when it changes")
    void portuguese() {
        WallPublisher publisher = publisher();
        publisher.onStateChanged(new MonitorStateChanged("m", MonitorState.OK, MonitorState.DOWN, NOW, NOW));
        assertThat(lastEvent().title()).isEqualTo("m está fora do ar");

        locale.set(Locale.ENGLISH);
        publisher.onStateChanged(new MonitorStateChanged("m", MonitorState.DOWN, MonitorState.OK, NOW, NOW));
        assertThat(lastEvent().title()).isEqualTo("m recovered");
    }

    @Test
    @DisplayName("a certificate warning notice becomes an INFO entry")
    void notice() {
        publisher().onNotice(new Notice("cert.warning", "cert_portal", "notice.cert.warning",
                List.of("Portal", 14L, 14), NOW));
        WallViews.TimelineEventView event = lastEvent();
        assertThat(event.kind()).isEqualTo("INFO");
        assertThat(event.title()).isEqualTo("Certificado de Portal expira em 14 dias");
    }
}
