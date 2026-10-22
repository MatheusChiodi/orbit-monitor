package io.orbit.workspace.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.common.MonitorState;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-42 status page API")
class StatusPageBuilderTest {

    private static final Instant NOW = Instant.parse("2026-10-18T12:00:00Z");
    private final StatusPageBuilder.StatusPage page =
            new StatusPageBuilder.StatusPage("stp_public", "status", "Example status", List.of("grp_portal", "grp_pay"), true);

    @Test
    @DisplayName("only the page's groups, with the worst state overall")
    void builds() {
        StatusPageBuilder.View view = StatusPageBuilder.build(page, Map.of(
                "grp_portal", new StatusPageBuilder.GroupInput("grp_portal", "Customer portal", MonitorState.OK, 99.98),
                "grp_pay", new StatusPageBuilder.GroupInput("grp_pay", "Payments", MonitorState.WARN, 99.5),
                "grp_internal", new StatusPageBuilder.GroupInput("grp_internal", "Internal", MonitorState.DOWN, 90.0)),
                NOW);

        assertThat(view.groups()).extracting(StatusPageBuilder.GroupStatus::name)
                .containsExactly("Customer portal", "Payments");
        assertThat(view.overall()).isEqualTo("WARN");
        assertThat(view.generatedAt()).isEqualTo(NOW);
    }

    @Test
    @DisplayName("serialized view has no values, errors or operator names")
    void noSensitiveFields() throws Exception {
        StatusPageBuilder.View view = StatusPageBuilder.build(page, Map.of(
                "grp_portal", new StatusPageBuilder.GroupInput("grp_portal", "Customer portal", MonitorState.OK, 99.98)),
                NOW);
        String json = new ObjectMapper().findAndRegisterModules().writeValueAsString(view);
        assertThat(json).doesNotContain("acknowledgedBy", "error", "value", "operator");
    }

    @Test
    @DisplayName("groups without data are UNKNOWN")
    void unknown() {
        assertThat(StatusPageBuilder.build(page, Map.of(), NOW).overall()).isEqualTo("UNKNOWN");
    }
}
