package io.orbit.api.web;

import io.orbit.api.config.OrbitProperties;
import org.junit.jupiter.api.BeforeEach;
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
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MonitorsApiTest {

    private static final String CONNECTION = """
            {"name":"H2 test","jdbcUrl":"jdbc:h2:mem:api-test;DB_CLOSE_DELAY=-1","username":"sa","password":"pw","poolSize":1}
            """;
    private static final String SQL_MONITOR = """
            {"type":"SQL","name":"Reconciliation queue","groupId":"grp_payments","connectionId":"con_h2",
             "sql":"SELECT 347 AS PENDING_QTY","intervalSeconds":60,"timeoutSeconds":10,"retries":1,
             "conditions":[{"field":"PENDING_QTY","operator":"<","value":"200","level":"WARN"}],
             "fields":[{"field":"PENDING_QTY","selected":true,"label":"Pending","format":"integer",
                        "storeAsSeries":true,"display":"number"}]}
            """;

    @Autowired
    MockMvc mvc;
    @Autowired
    OrbitProperties properties;

    private ResultActions send(MockHttpServletRequestBuilder builder, String body) throws Exception {
        return mvc.perform(builder.contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @BeforeEach
    void connection() throws Exception {
        send(put("/api/connections/con_h2"), CONNECTION).andExpect(status().isOk());
    }

    @Test
    void connectionPasswordIsSealedAndNeverReturned() throws Exception {
        // Other tests share the Spring context and config dir, so look the connection up by id
        // instead of relying on its position; every listed password must be masked.
        mvc.perform(get("/api/connections"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == 'con_h2')].id").value("con_h2"))
                .andExpect(jsonPath("$[?(@.id == 'con_h2')].kind").value("H2"))
                .andExpect(jsonPath("$[?(@.id == 'con_h2')].password").value("•••• (vault)"))
                .andExpect(jsonPath("$[*].password", everyItem(is("•••• (vault)"))));
        String file = Files.readString(properties.configDir().resolve("orbit.connections.json"));
        assertThat(file).contains("\"enc\"").doesNotContain("\"pw\"");
        send(post("/api/connections/con_h2/test"), "").andExpect(jsonPath("$.ok").value(true));
    }

    @Test
    void updatingAConnectionWithoutPasswordKeepsTheSecret() throws Exception {
        send(put("/api/connections/con_h2"), "{\"name\":\"Renamed\",\"jdbcUrl\":\"jdbc:h2:mem:api-test;DB_CLOSE_DELAY=-1\","
                + "\"username\":\"sa\",\"poolSize\":1}").andExpect(jsonPath("$.password").value("•••• (vault)"));
        send(post("/api/connections/con_h2/test"), "").andExpect(jsonPath("$.ok").value(true));
    }

    @Test
    void sqlPreviewShowsTypedColumnsAndSuggestsAReadMode() throws Exception {
        send(post("/api/monitors/preview"), "{\"type\":\"SQL\",\"connectionId\":\"con_h2\",\"sql\":\"SELECT 347 AS PENDING_QTY\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.columns[0].name").value("PENDING_QTY"))
                .andExpect(jsonPath("$.columns[0].type").value("number"))
                .andExpect(jsonPath("$.rows[0].PENDING_QTY").value(347))
                .andExpect(jsonPath("$.suggestion.suggested").value("SINGLE_VALUE"));
        mvc.perform(get("/api/audit").param("action", "select.preview"))
                .andExpect(jsonPath("$[0].detail").value("SELECT 347 AS PENDING_QTY"));
    }

    @Test
    void unsafePreviewIsRejected() throws Exception {
        send(post("/api/monitors/preview"), "{\"type\":\"SQL\",\"connectionId\":\"con_h2\",\"sql\":\"DROP TABLE x\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("unsafe-sql"));
    }

    @Test
    void sqlMonitorLifecycle() throws Exception {
        String id = com.jayway.jsonpath.JsonPath.read(send(post("/api/monitors"), SQL_MONITOR)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.definition.conditions[0].expression").value("[COL].PENDING_QTY < 200"))
                .andExpect(jsonPath("$.definition.fields[0].series").value(true))
                .andReturn().getResponse().getContentAsString(), "$.definition.id");
        assertThat(id).startsWith("sel_");

        send(post("/api/monitors/" + id + "/run"), "")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("WARN"))
                .andExpect(jsonPath("$.conditions[0].passed").value(false));

        mvc.perform(get("/api/monitors"))
                .andExpect(jsonPath("$[*].id", hasItem(id)));
        mvc.perform(get("/api/monitors/" + id))
                .andExpect(jsonPath("$.status.status").value("WARN"))
                .andExpect(jsonPath("$.status.value").value(347.0))
                .andExpect(jsonPath("$.lastResult.payload.rows[0][0]").value(347));

        mvc.perform(delete("/api/monitors/" + id)).andExpect(status().isNoContent());
        mvc.perform(get("/api/monitors/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void httpMonitorCredentialsGoToTheVault() throws Exception {
        String body = """
                {"type":"HTTP","name":"Portal","groupId":"grp_portal","method":"GET",
                 "url":"https://portal.example.com/health","headers":{"Accept":"application/json",
                 "Authorization":"Bearer abc.def"},"intervalSeconds":30,"timeoutSeconds":5,"retries":2,
                 "conditions":[{"expression":"[STATUS] == 200","level":"DOWN"}],"fields":[]}
                """;
        send(post("/api/monitors"), body)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.definition.id", startsWith("req_")))
                .andExpect(jsonPath("$.definition.headers.Accept").value("application/json"))
                .andExpect(jsonPath("$.definition.secretHeaders.Authorization").value("•••• (vault)"));
        assertThat(Files.readString(properties.configDir().resolve("orbit.requests.json"))).doesNotContain("abc.def");
    }

    @Test
    void conditionsCanBeCheckedBeforeSaving() throws Exception {
        send(post("/api/conditions/validate"), "{\"expression\":\"[COL].QTY < 50\",\"level\":\"WARN\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.placeholder").value("COL"))
                .andExpect(jsonPath("$.operator").value("<"));
        send(post("/api/conditions/validate"), "{\"expression\":\"[NOPE] == 1\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("invalid-condition"));
    }

    @Test
    void unknownMonitorRunIsNotFound() throws Exception {
        send(post("/api/monitors/nope/run"), "").andExpect(status().isNotFound());
    }
}
