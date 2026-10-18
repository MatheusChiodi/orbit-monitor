package io.orbit.workspace;

import io.orbit.common.MonitorState;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigMapper;
import io.orbit.config.ConfigValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GroupServiceTest {

    @TempDir
    Path dir;
    private GroupService service;

    @BeforeEach
    void setUp() {
        service = new GroupService(new ConfigFile<>(dir, "groups", Group.class, ConfigMapper.create(),
                GroupService.VALIDATOR));
    }

    private static Group group(String id, String name) {
        return new Group(id, name, "#3b9eff", "credit-card", "Payment flows", "Payments team", List.of("pci"), 0,
                null, null);
    }

    @Test
    void createsAndListsGroupsInOrder() {
        service.save(group("grp_b", "Core bank").withOrder(2), "Ana");
        service.save(group("grp_a", "Payments").withOrder(1), "Ana");

        assertThat(service.list()).extracting(Group::id).containsExactly("grp_a", "grp_b");
        assertThat(service.find("grp_a")).map(Group::updatedBy).contains("Ana");
        assertThat(service.find("grp_a")).map(Group::updatedAt).isPresent();
    }

    @Test
    void updatesInPlace() {
        service.save(group("grp_a", "Payments"), "Ana");
        service.save(group("grp_a", "Payments v2"), "Bia");

        assertThat(service.list()).hasSize(1);
        assertThat(service.find("grp_a")).map(Group::name).contains("Payments v2");
    }

    @Test
    void persistsToTheGroupsFile() {
        service.save(group("grp_a", "Payments"), "Ana");
        GroupService reloaded = new GroupService(new ConfigFile<>(dir, "groups", Group.class, ConfigMapper.create(),
                GroupService.VALIDATOR));
        assertThat(reloaded.list()).extracting(Group::name).containsExactly("Payments");
    }

    @Test
    void deletes() {
        service.save(group("grp_a", "Payments"), "Ana");
        assertThat(service.delete("grp_a")).isTrue();
        assertThat(service.delete("grp_a")).isFalse();
        assertThat(service.list()).isEmpty();
    }

    @Test
    void validatesNameColorAndId() {
        assertThatThrownBy(() -> service.save(group("grp_a", " "), "Ana")).isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> service.save(group("grp a", "X"), "Ana")).isInstanceOf(ConfigValidationException.class);
        Group badColor = new Group("grp_c", "X", "blue", null, null, null, List.of(), 0, null, null);
        assertThatThrownBy(() -> service.save(badColor, "Ana")).isInstanceOf(ConfigValidationException.class);
    }

    @Test
    void groupStateIsTheWorstMonitorState() {
        Map<String, MonitorState> states = Map.of("m1", MonitorState.OK, "m2", MonitorState.WARN, "m3", MonitorState.DOWN);

        assertThat(GroupService.stateOf(List.of("m1", "m2"), states::get)).isEqualTo(MonitorState.WARN);
        assertThat(GroupService.stateOf(List.of("m1", "m2", "m3"), states::get)).isEqualTo(MonitorState.DOWN);
        assertThat(GroupService.stateOf(List.of("m1"), states::get)).isEqualTo(MonitorState.OK);
        assertThat(GroupService.stateOf(List.of(), states::get)).isEqualTo(MonitorState.UNKNOWN);
        assertThat(GroupService.stateOf(List.of("nope"), id -> null)).isEqualTo(MonitorState.UNKNOWN);
    }
}
