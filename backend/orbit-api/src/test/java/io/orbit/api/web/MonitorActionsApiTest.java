package io.orbit.api.web;

import com.jayway.jsonpath.JsonPath;
import io.orbit.api.config.OrbitProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.file.Files;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("BE-54..56: pause/resume, duplicate, bulk actions, push token rotation and safe group delete")
class MonitorActionsApiTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    OrbitProperties properties;

    private ResultActions send(MockHttpServletRequestBuilder builder, String body) throws Exception {
        return mvc.perform(builder.contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private String tcp(String name, String group) throws Exception {
        String created = send(post("/api/monitors"), """
                {"type":"TCP","name":"%s","groupId":"%s","host":"127.0.0.1","port":1,"intervalSeconds":60}
                """.formatted(name, group)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(created, "$.definition.id");
    }

    private String http(String name) throws Exception {
        String created = send(post("/api/monitors"), """
                {"type":"HTTP","name":"%s","groupId":"grp_act","method":"GET","url":"https://portal.example.com/health",
                 "headers":{"Authorization":"Bearer dup.secret"},"intervalSeconds":30,"timeoutSeconds":5,"retries":2,
                 "window":{"days":["MONDAY"],"from":"08:00","to":"18:00"},
                 "conditions":[{"expression":"[STATUS] == 200","level":"DOWN"}],"fields":[]}
                """.formatted(name)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(created, "$.definition.id");
    }

    private String pushMonitor(String name) throws Exception {
        String created = send(post("/api/monitors"), """
                {"type":"PUSH","name":"%s","groupId":"grp_act","intervalSeconds":60,"maxSilenceSeconds":3600}
                """.formatted(name)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(created, "$.definition.id");
    }

    @Test
    @DisplayName("pause and resume flip only the paused flag and are audited")
    void pauseAndResume() throws Exception {
        String id = http("Pausable");
        mvc.perform(post("/api/monitors/" + id + "/pause"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.definition.paused").value(true))
                .andExpect(jsonPath("$.definition.window.from").value("08:00"))
                .andExpect(jsonPath("$.definition.secretHeaders.Authorization").value("•••• (vault)"))
                .andExpect(jsonPath("$.status.paused").value(true));
        mvc.perform(get("/api/monitors")).andExpect(jsonPath("$[?(@.id == '" + id + "')].paused").value(true));
        mvc.perform(post("/api/monitors/" + id + "/resume"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.definition.paused").value(false));
        mvc.perform(get("/api/audit").param("target", id))
                .andExpect(jsonPath("$[*].action", hasItem("monitor.pause")))
                .andExpect(jsonPath("$[*].action", hasItem("monitor.resume")));
        mvc.perform(post("/api/monitors/missing_monitor/pause")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("pausing needs an editor")
    void pauseNeedsAnEditor() throws Exception {
        String id = tcp("Lan pause", "grp_act");
        mvc.perform(post("/api/monitors/" + id + "/pause").with(r -> {
            r.setRemoteAddr("192.168.0.5");
            return r;
        })).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("a duplicate gets a new id, a (copy) name, the sealed secrets and runs")
    void duplicate() throws Exception {
        String id = http("Original portal");
        mvc.perform(post("/api/monitors/" + id + "/pause")).andExpect(status().isOk());
        String copy = mvc.perform(post("/api/monitors/" + id + "/duplicate"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.definition.id", startsWith("req_original_portal_copy_")))
                .andExpect(jsonPath("$.definition.name").value("Original portal (copy)"))
                .andExpect(jsonPath("$.definition.paused").value(false))
                .andExpect(jsonPath("$.definition.window.from").value("08:00"))
                .andExpect(jsonPath("$.definition.secretHeaders.Authorization").value("•••• (vault)"))
                .andReturn().getResponse().getContentAsString();
        String copyId = JsonPath.read(copy, "$.definition.id");
        assertThat(copyId).isNotEqualTo(id);
        assertThat(Files.readString(properties.configDir().resolve("orbit.requests.json"))).doesNotContain("dup.secret");
        mvc.perform(get("/api/audit").param("target", copyId))
                .andExpect(jsonPath("$[0].action").value("monitor.duplicate"))
                .andExpect(jsonPath("$[0].detail").value("from " + id));
        mvc.perform(post("/api/monitors/missing_monitor/duplicate")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("a duplicated push monitor gets its own URL")
    void duplicatePush() throws Exception {
        String id = pushMonitor("Nightly dup");
        String copy = mvc.perform(post("/api/monitors/" + id + "/duplicate"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.pushUrl", startsWith("http://localhost/api/push/")))
                .andReturn().getResponse().getContentAsString();
        String pushUrl = JsonPath.read(copy, "$.pushUrl");
        String copyId = JsonPath.read(copy, "$.definition.id");
        mvc.perform(post("/api/push/" + pushUrl.substring(pushUrl.lastIndexOf('/') + 1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.monitorId").value(copyId));
    }

    @Test
    @DisplayName("regenerating the push token invalidates the old URL")
    void pushToken() throws Exception {
        String created = send(post("/api/monitors"), """
                {"type":"PUSH","name":"Rotating","groupId":"grp_act","intervalSeconds":60,"maxSilenceSeconds":600}
                """).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(created, "$.definition.id");
        String oldUrl = JsonPath.read(created, "$.pushUrl");
        String rotated = mvc.perform(post("/api/monitors/" + id + "/push-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.monitorId").value(id))
                .andExpect(jsonPath("$.pushUrl", startsWith("http://localhost/api/push/")))
                .andReturn().getResponse().getContentAsString();
        String newUrl = JsonPath.read(rotated, "$.pushUrl");
        String newToken = newUrl.substring(newUrl.lastIndexOf('/') + 1);
        assertThat(newUrl).isNotEqualTo(oldUrl);
        mvc.perform(post("/api/push/" + oldUrl.substring(oldUrl.lastIndexOf('/') + 1))).andExpect(status().isNotFound());
        mvc.perform(post("/api/push/" + newToken)).andExpect(status().isOk());
        assertThat(Files.readString(properties.configDir().resolve("orbit.checks.json"))).doesNotContain(newToken);
        mvc.perform(get("/api/audit").param("target", id))
                .andExpect(jsonPath("$[0].action").value("monitor.push-token"))
                .andExpect(jsonPath("$[0].detail").doesNotExist());

        String tcpId = tcp("Not push", "grp_act");
        mvc.perform(post("/api/monitors/" + tcpId + "/push-token")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/monitors/missing_monitor/push-token")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("bulk actions report per id and leave one audit entry")
    void bulk() throws Exception {
        send(put("/api/groups/grp_bulk_to"), "{\"name\":\"Bulk target\"}").andExpect(status().isOk());
        String a = tcp("Bulk a", "grp_act");
        String b = tcp("Bulk b", "grp_act");
        send(post("/api/monitors/bulk"), "{\"ids\":[\"%s\",\"%s\",\"missing_x\"],\"action\":\"pause\"}".formatted(a, b))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.action").value("pause"))
                .andExpect(jsonPath("$.results[0].id").value(a))
                .andExpect(jsonPath("$.results[0].ok").value(true))
                .andExpect(jsonPath("$.results[2].ok").value(false))
                .andExpect(jsonPath("$.results[2].error").value("not-found"));
        mvc.perform(get("/api/monitors/" + a)).andExpect(jsonPath("$.definition.paused").value(true));

        send(post("/api/monitors/bulk"), "{\"ids\":[\"%s\"],\"action\":\"resume\"}".formatted(a))
                .andExpect(jsonPath("$.results[0].ok").value(true));
        mvc.perform(get("/api/monitors/" + a)).andExpect(jsonPath("$.definition.paused").value(false));

        send(post("/api/monitors/bulk"), "{\"ids\":[\"%s\",\"%s\"],\"action\":\"move\",\"groupId\":\"grp_bulk_to\"}"
                .formatted(a, b)).andExpect(jsonPath("$.results[1].ok").value(true));
        mvc.perform(get("/api/monitors/" + b)).andExpect(jsonPath("$.definition.groupId").value("grp_bulk_to"));

        send(post("/api/monitors/bulk"), "{\"ids\":[\"%s\"],\"action\":\"delete\"}".formatted(b))
                .andExpect(jsonPath("$.results[0].ok").value(true));
        mvc.perform(get("/api/monitors/" + b)).andExpect(status().isNotFound());

        mvc.perform(get("/api/audit").param("action", "monitor.bulk"))
                .andExpect(jsonPath("$[0].detail").value("delete 1: " + b));
    }

    @Test
    @DisplayName("bulk rejects unknown actions, a move without a known group and empty id lists")
    void bulkValidation() throws Exception {
        send(post("/api/monitors/bulk"), "{\"ids\":[\"x\"],\"action\":\"tag\"}").andExpect(status().isBadRequest());
        send(post("/api/monitors/bulk"), "{\"ids\":[\"x\"],\"action\":\"move\"}").andExpect(status().isBadRequest());
        send(post("/api/monitors/bulk"), "{\"ids\":[\"x\"],\"action\":\"move\",\"groupId\":\"grp_nope\"}")
                .andExpect(status().isBadRequest());
        send(post("/api/monitors/bulk"), "{\"ids\":[],\"action\":\"pause\"}").andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("a group with monitors is deleted only after moving them")
    void groupDelete() throws Exception {
        send(put("/api/groups/grp_del_src"), "{\"name\":\"Source\"}").andExpect(status().isOk());
        send(put("/api/groups/grp_del_dst"), "{\"name\":\"Destination\"}").andExpect(status().isOk());
        String member = tcp("Member", "grp_del_src");

        mvc.perform(delete("/api/groups/grp_del_src"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("group-not-empty"))
                .andExpect(jsonPath("$.members[0].id").value(member))
                .andExpect(jsonPath("$.members[0].name").value("Member"));
        mvc.perform(delete("/api/groups/grp_del_src").param("moveTo", "grp_del_src")).andExpect(status().isBadRequest());
        mvc.perform(delete("/api/groups/grp_del_src").param("moveTo", "grp_unknown")).andExpect(status().isBadRequest());

        mvc.perform(delete("/api/groups/grp_del_src").param("moveTo", "grp_del_dst")).andExpect(status().isNoContent());
        mvc.perform(get("/api/monitors/" + member)).andExpect(jsonPath("$.definition.groupId").value("grp_del_dst"));
        mvc.perform(get("/api/groups")).andExpect(jsonPath("$[*].id", not(hasItem("grp_del_src"))));
        mvc.perform(get("/api/audit").param("target", "grp_del_src"))
                .andExpect(jsonPath("$[0].detail").value("1 monitors moved to grp_del_dst"));
    }

    @Test
    @DisplayName("an empty group is deleted directly")
    void emptyGroupDelete() throws Exception {
        send(put("/api/groups/grp_del_empty"), "{\"name\":\"Empty\"}").andExpect(status().isOk());
        mvc.perform(delete("/api/groups/grp_del_empty")).andExpect(status().isNoContent());
        mvc.perform(delete("/api/groups/grp_del_empty")).andExpect(status().isNotFound());
    }
}
