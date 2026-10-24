package io.orbit.monitor.definition;

import io.orbit.config.ConfigMapper;
import io.orbit.monitor.condition.Severity;
import io.orbit.security.vault.SecretRef;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** BE-54: pause/resume, move, duplicate and delete of any monitor kind without resending the definition. */
class MonitorEditsTest {

    @TempDir
    Path dir;
    private MonitorDefinitions definitions;

    @BeforeEach
    void setUp() {
        definitions = MonitorDefinitions.open(dir, ConfigMapper.create());
        definitions.saveConnection(new ConnectionDef("con_core", "Core", "jdbc:h2:mem:edits", "sa",
                SecretRef.env("CORE_PW"), 1, null, null), "Ana");
    }

    private SqlMonitorDef select() {
        return definitions.saveSelect(new SqlMonitorDef("sel_queue", "Queue", "grp_a", "con_core", "SELECT 1 AS N", 60,
                30_000, 500, 2, 0.10, false, List.of(new ConditionDef("[COL].N < 2", Severity.DOWN)), List.of(), false,
                null, null, Map.of("limit", 5), new WindowDef(List.of("MONDAY"), "08:00", "18:00", null),
                new RetryDef(3, null, null, null)), "Ana");
    }

    private HttpMonitorDef request() {
        return definitions.saveRequest(new HttpMonitorDef("req_portal", "Portal", "grp_a", "GET",
                "https://portal.example.com/health", Map.of(), Map.of("Authorization", SecretRef.env("PORTAL_TOKEN")),
                null, 30, 5_000, true, 2, 0.10, false, List.of(), List.of(), true, null, null,
                List.of(), new HttpMonitorDef.OAuth("https://idp/token", "client", SecretRef.env("IDP_SECRET"), null),
                null, null), "Ana");
    }

    private CheckMonitorDef push() {
        return definitions.saveCheck(new CheckMonitorDef("push_job", "Nightly job", "grp_a",
                CheckMonitorDef.Type.PUSH, null, null, SecretRef.env("PUSH_TOKEN"), 3600, 60, 10_000, 1, 0.10, false,
                List.of(), List.of(), false, null, null), "Ana");
    }

    @Test
    void movingToAGroupKeepsEverySetting() {
        select();
        assertThat(definitions.moveToGroup("sel_queue", "grp_b", "Bia")).isTrue();
        SqlMonitorDef moved = definitions.selects().getFirst();
        assertThat(moved.groupId()).isEqualTo("grp_b");
        assertThat(moved.window()).isNotNull();
        assertThat(moved.retry()).isEqualTo(new RetryDef(3, null, null, null));
        assertThat(moved.parameters()).containsEntry("limit", 5);
    }

    @Test
    void pausesAndResumesAnyKind() {
        select();
        request();
        push();
        assertThat(definitions.setPaused("sel_queue", true, "Bia")).isTrue();
        assertThat(definitions.setPaused("req_portal", false, "Bia")).isTrue();
        assertThat(definitions.setPaused("push_job", true, "Bia")).isTrue();
        assertThat(definitions.setPaused("missing", true, "Bia")).isFalse();
        assertThat(definitions.monitor("sel_queue").orElseThrow().paused()).isTrue();
        assertThat(definitions.monitor("req_portal").orElseThrow().paused()).isFalse();
        assertThat(definitions.monitor("push_job").orElseThrow().paused()).isTrue();
        assertThat(((SqlMonitorDef) definitions.monitor("sel_queue").orElseThrow()).updatedBy()).isEqualTo("Bia");
        assertThat(((SqlMonitorDef) definitions.monitor("sel_queue").orElseThrow()).window()).isNotNull();
    }

    @Test
    void copiesKeepSealedSecretsAndAreActive() {
        HttpMonitorDef original = request();
        MonitorDef copy = MonitorEdits.copy(original, "req_portal_copy", "Portal (copy)");
        HttpMonitorDef http = (HttpMonitorDef) copy;
        assertThat(http.id()).isEqualTo("req_portal_copy");
        assertThat(http.name()).isEqualTo("Portal (copy)");
        assertThat(http.paused()).isFalse();
        assertThat(http.secretHeaders()).isEqualTo(original.secretHeaders());
        assertThat(http.oauth()).isEqualTo(original.oauth());
    }

    @Test
    void copiedPushMonitorsGetNoTokenSoTheCallerIssuesANewOne() {
        CheckMonitorDef copy = (CheckMonitorDef) MonitorEdits.copy(push(), "push_job_copy", "Nightly job (copy)");
        assertThat(copy.pushToken()).isNull();
        assertThat(copy.maxSilenceSeconds()).isEqualTo(3600);
    }

    @Test
    void copyIdsKeepThePrefixAndAreUnique() {
        String a = MonitorEdits.copyId(request());
        String b = MonitorEdits.copyId(request());
        assertThat(a).startsWith("req_portal_copy_").isNotEqualTo(b);
        assertThat(MonitorEdits.copyId(push())).startsWith("push_nightly_job_copy_");
    }

    @Test
    void savesAndDeletesAnyKind() {
        CheckMonitorDef saved = (CheckMonitorDef) definitions.save(MonitorEdits.copy(push(), "push_b", "B"), "Bia");
        assertThat(saved.updatedBy()).isEqualTo("Bia");
        assertThat(definitions.delete("push_b")).isTrue();
        assertThat(definitions.delete("push_b")).isFalse();
    }

    @Test
    void connectionUsersAreListedAndDeletionNeedsForce() {
        select();
        assertThat(definitions.connectionUsers("con_core")).containsExactly("sel_queue");
        assertThatThrownBy(() -> definitions.deleteConnection("con_core")).isInstanceOf(IllegalStateException.class);
        assertThat(definitions.deleteConnection("con_core", true, "Bia")).isTrue();
        assertThat(definitions.connection("con_core")).isEmpty();
        assertThat(definitions.monitor("sel_queue").orElseThrow().paused()).isTrue();
    }
}
