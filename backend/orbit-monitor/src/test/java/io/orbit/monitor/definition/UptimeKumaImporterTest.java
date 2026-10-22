package io.orbit.monitor.definition;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-43 Uptime Kuma import")
class UptimeKumaImporterTest {

    private static final String BACKUP = """
            {"version":"1.23.0",
             "monitorList":[
               {"id":1,"name":"Portal","type":"http","url":"https://portal.example.com/health","method":"GET",
                "interval":60,"timeout":48,"maxretries":2,"parent":10,"accepted_statuscodes":["200-299"],
                "basic_auth_user":"admin","basic_auth_pass":"secret-pass"},
               {"id":2,"name":"API keyword","type":"keyword","url":"https://api.example.com/ping","keyword":"pong",
                "interval":30,"timeout":10,"maxretries":0},
               {"id":10,"name":"Customer portal","type":"group"},
               {"id":3,"name":"Docker thing","type":"docker"}
             ]}
            """;

    @Test
    @DisplayName("maps HTTP and keyword monitors with interval, timeout, retries and status rule")
    void mapsMonitors() {
        UptimeKumaImporter.Result r = UptimeKumaImporter.parse(BACKUP);

        assertThat(r.requests()).hasSize(2);
        HttpMonitorDef portal = r.requests().getFirst();
        assertThat(portal.url()).isEqualTo("https://portal.example.com/health");
        assertThat(portal.intervalSeconds()).isEqualTo(60);
        assertThat(portal.timeoutMs()).isEqualTo(48_000);
        assertThat(portal.downAfter()).isEqualTo(3);
        assertThat(portal.conditions()).extracting(ConditionDef::expression).contains("[STATUS] between 200 and 299");
        assertThat(r.requests().get(1).conditions()).extracting(ConditionDef::expression)
                .contains("[BODY] contains \"pong\"");
    }

    @Test
    @DisplayName("Kuma groups become Orbit groups")
    void mapsGroups() {
        UptimeKumaImporter.Result r = UptimeKumaImporter.parse(BACKUP);
        assertThat(r.groups()).extracting(UptimeKumaImporter.ImportedGroup::name).containsExactly("Customer portal");
        assertThat(r.requests().getFirst().groupId()).isEqualTo(r.groups().getFirst().id());
    }

    @Test
    @DisplayName("passwords are not imported and unsupported types are reported")
    void secretsAndSkipped() {
        UptimeKumaImporter.Result r = UptimeKumaImporter.parse(BACKUP);
        assertThat(r.requests().getFirst().toString()).doesNotContain("secret-pass");
        assertThat(r.skipped()).singleElement().asString().contains("Docker thing");
    }
}
