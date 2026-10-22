package io.orbit.workspace;

import io.orbit.common.MonitorState;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CORE-07 workspaces and maintenance-aware group state")
class WorkspaceServiceTest {

    @TempDir
    Path dir;

    @Test
    @DisplayName("workspaces group the groups (Production, Staging)")
    void workspaces() {
        WorkspaceService service = new WorkspaceService(new ConfigFile<>(dir, "workspaces", WorkspaceService.Workspace.class,
                ConfigMapper.create(), items -> List.of()));
        service.save(new WorkspaceService.Workspace("wks_prod", "Production", List.of("grp_pay", "grp_portal")), "Ana");

        assertThat(service.list()).extracting(WorkspaceService.Workspace::name).containsExactly("Production");
        assertThat(service.workspaceOf("grp_pay")).map(WorkspaceService.Workspace::id).contains("wks_prod");
    }

    @Test
    @DisplayName("monitors in maintenance do not drive the group state")
    void maintenanceIgnored() {
        Map<String, MonitorState> states = Map.of("m1", MonitorState.OK, "m2", MonitorState.DOWN);
        assertThat(WorkspaceService.groupState(List.of("m1", "m2"), states::get, Set.of("m2")))
                .isEqualTo(MonitorState.OK);
        assertThat(WorkspaceService.groupState(List.of("m1", "m2"), states::get, Set.of()))
                .isEqualTo(MonitorState.DOWN);
    }

    @Test
    @DisplayName("saves are stamped, a group belongs to one workspace and delete works")
    void lifecycle() {
        WorkspaceService service = new WorkspaceService(new ConfigFile<>(dir, "workspaces",
                WorkspaceService.Workspace.class, ConfigMapper.create(), WorkspaceService.VALIDATOR));
        WorkspaceService.Workspace saved = service.save(new WorkspaceService.Workspace("wks_prod", "Production",
                List.of("grp_pay")), "Ana");

        assertThat(saved.updatedBy()).isEqualTo("Ana");
        assertThat(saved.updatedAt()).isNotNull();
        assertThat(service.find("wks_prod")).isPresent();
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.save(new WorkspaceService.Workspace(
                "wks_stg", "Staging", List.of("grp_pay")), "Ana"))
                .isInstanceOf(io.orbit.config.ConfigValidationException.class);
        assertThat(service.delete("wks_prod")).isTrue();
        assertThat(service.delete("wks_prod")).isFalse();
    }
}
