package io.orbit.workspace.layout;

import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigMapper;
import io.orbit.config.ConfigValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.time.Clock;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-41 wall layouts")
class WallLayoutServiceTest {

    @TempDir
    Path dir;
    private WallLayoutService service;

    @BeforeEach
    void setUp() {
        service = new WallLayoutService(new ConfigFile<>(dir, "layouts", WallLayoutService.Layout.class,
                ConfigMapper.create(), items -> List.of()), Clock.systemUTC());
    }

    private static WallLayoutService.Layout layout(String id, String slug, List<WallLayoutService.Block> blocks) {
        return new WallLayoutService.Layout(id, slug, "Payments team", 0, blocks, null, null);
    }

    private static final WallLayoutService.Block HERO =
            new WallLayoutService.Block("hero", 0, 0, 6, 4, "grp_payments", null, null);

    @Test
    @DisplayName("found by slug and versioned on each save")
    void versions() {
        service.save(layout("lay_pay", "payments", List.of(HERO)), "Ana");
        WallLayoutService.Layout second = service.save(layout("lay_pay", "payments", List.of(HERO)), "Bia");

        assertThat(second.version()).isEqualTo(2);
        assertThat(service.bySlug("payments")).map(WallLayoutService.Layout::updatedBy).contains("Bia");
        assertThat(service.bySlug("missing")).isEmpty();
    }

    @Test
    @DisplayName("slugs are unique and URL-safe; blocks fit 12 columns")
    void validates() {
        service.save(layout("lay_a", "noc", List.of(HERO)), "Ana");
        assertThatThrownBy(() -> service.save(layout("lay_b", "noc", List.of()), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> service.save(layout("lay_c", "No C!", List.of()), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        var wide = new WallLayoutService.Block("table", 8, 0, 6, 2, "sel_x", null, "table");
        assertThatThrownBy(() -> service.save(layout("lay_d", "wide", List.of(wide)), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
    }

    @Test
    @DisplayName("a default noc layout exists when nothing is configured")
    void defaultLayout() {
        assertThat(service.defaultLayout().slug()).isEqualTo("noc");
        assertThat(service.defaultLayout().blocks()).isNotEmpty();
    }

    @Test
    @DisplayName("keeps the layout theme, animation override, playlist and block options (FE-05, FE-06, FE-19, FE-58)")
    void wallOptions() {
        var series = new WallLayoutService.Block("series-1", "series", 0, 0, 6, 3, "mon_api", null, null, "7d", null);
        var note = new WallLayoutService.Block("note", "text", 6, 0, 6, 3, null, null, null, null, "Call the on-call SRE");
        var playlist = new WallLayoutService.Playlist(List.of(new WallLayoutService.PlaylistEntry("rotation", 60),
                new WallLayoutService.PlaylistEntry("noc", 30)));
        service.save(new WallLayoutService.Layout("lay_rot", "rotation", "Rotation", 0, List.of(series, note), null, null,
                "nord", "minimal", playlist), "Ana");

        ConfigFile<WallLayoutService.Layout> reread = new ConfigFile<>(dir, "layouts", WallLayoutService.Layout.class,
                ConfigMapper.create(), items -> List.of());
        WallLayoutService.Layout saved = new WallLayoutService(reread, Clock.systemUTC()).bySlug("rotation").orElseThrow();
        assertThat(saved.themeId()).isEqualTo("nord");
        assertThat(saved.animationLevel()).isEqualTo("minimal");
        assertThat(saved.playlist().entries()).extracting(WallLayoutService.PlaylistEntry::layout).containsExactly("rotation", "noc");
        assertThat(saved.blocks()).extracting(WallLayoutService.Block::id).containsExactly("series-1", "note");
        assertThat(saved.blocks().get(0).range()).isEqualTo("7d");
        assertThat(saved.blocks().get(1).text()).isEqualTo("Call the on-call SRE");
    }

    @Test
    @DisplayName("rejects unknown theme ids, animation levels, block ranges, long texts and short or bad playlist entries")
    void validatesWallOptions() {
        assertThatThrownBy(() -> service.save(new WallLayoutService.Layout("l1", "a", "A", 0, List.of(), null, null,
                "Not A Theme", null, null), "Ana")).isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> service.save(new WallLayoutService.Layout("l2", "b", "B", 0, List.of(), null, null,
                null, "loud", null), "Ana")).isInstanceOf(ConfigValidationException.class);
        var badRange = new WallLayoutService.Block("s", "series", 0, 0, 6, 3, null, null, null, "1y", null);
        assertThatThrownBy(() -> service.save(layout("l3", "c", List.of(badRange)), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        var longText = new WallLayoutService.Block("t", "text", 0, 0, 6, 3, null, null, null, null, "x".repeat(281));
        assertThatThrownBy(() -> service.save(layout("l4", "d", List.of(longText)), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        var shortEntry = new WallLayoutService.Playlist(List.of(new WallLayoutService.PlaylistEntry("noc", 2)));
        assertThatThrownBy(() -> service.save(new WallLayoutService.Layout("l5", "e", "E", 0, List.of(), null, null,
                null, null, shortEntry), "Ana")).isInstanceOf(ConfigValidationException.class);
        var badSlug = new WallLayoutService.Playlist(List.of(new WallLayoutService.PlaylistEntry("Bad Slug", 60)));
        assertThatThrownBy(() -> service.save(new WallLayoutService.Layout("l6", "f", "F", 0, List.of(), null, null,
                null, null, badSlug), "Ana")).isInstanceOf(ConfigValidationException.class);
    }
}
