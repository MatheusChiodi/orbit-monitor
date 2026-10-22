package io.orbit.workspace.status;

import io.orbit.common.MonitorState;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigMapper;
import io.orbit.config.ConfigValidationException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-42 orbit.status-pages.json store")
class StatusPageServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-18T12:00:00Z");

    @TempDir
    Path dir;

    private StatusPageService service() {
        return new StatusPageService(new ConfigFile<>(dir, "status-pages", StatusPageBuilder.StatusPage.class,
                ConfigMapper.create(), StatusPageService.VALIDATOR), Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static StatusPageBuilder.StatusPage page(String id, String slug, boolean pub) {
        return new StatusPageBuilder.StatusPage(id, slug, "Example status", List.of("grp_pay"), pub);
    }

    @Test
    @DisplayName("pages are saved with the operator and found by slug")
    void saves() {
        service().save(page("stp_public", "status", true), "Ana");

        StatusPageService reloaded = service();
        assertThat(reloaded.bySlug("status")).hasValueSatisfying(p -> {
            assertThat(p.pub()).isTrue();
            assertThat(p.updatedBy()).isEqualTo("Ana");
            assertThat(p.updatedAt()).isEqualTo(NOW);
        });
        assertThat(reloaded.list()).hasSize(1);
    }

    @Test
    @DisplayName("public pages are visible to everyone, internal ones only to editors")
    void visibility() {
        StatusPageService s = service();
        s.save(page("stp_public", "status", true), "Ana");
        s.save(page("stp_internal", "internal", false), "Ana");

        assertThat(s.visible(false)).extracting(StatusPageBuilder.StatusPage::slug).containsExactly("status");
        assertThat(s.visible(true)).extracting(StatusPageBuilder.StatusPage::slug).containsExactly("internal", "status");
        assertThat(s.view("internal", false, Map.of())).isEmpty();
        assertThat(s.view("status", false, Map.of("grp_pay",
                new StatusPageBuilder.GroupInput("grp_pay", "Payments", MonitorState.OK, 99.9))))
                .hasValueSatisfying(v -> assertThat(v.overall()).isEqualTo("OK"));
    }

    @Test
    @DisplayName("slugs are unique and URL-safe; a title is required")
    void validation() {
        StatusPageService s = service();
        s.save(page("stp_a", "status", true), "Ana");

        assertThatThrownBy(() -> s.save(page("stp_b", "status", true), "Ana")).isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> s.save(page("stp_c", "Bad Slug", true), "Ana")).isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> s.save(new StatusPageBuilder.StatusPage("stp_d", "d", " ", List.of(), true), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
    }

    @Test
    @DisplayName("delete")
    void delete() {
        StatusPageService s = service();
        s.save(page("stp_a", "status", true), "Ana");
        assertThat(s.delete("stp_a")).isTrue();
        assertThat(s.delete("stp_a")).isFalse();
    }
}
