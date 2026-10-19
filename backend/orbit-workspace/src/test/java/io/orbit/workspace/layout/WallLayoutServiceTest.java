package io.orbit.workspace.layout;

import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigMapper;
import io.orbit.config.ConfigValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.time.Clock;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("pending")
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
}
