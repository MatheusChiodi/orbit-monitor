package io.orbit.api.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AccessAndGroupsApiTest {

    private static final String GROUP = """
            {"name":"Payments","color":"#3b9eff","icon":"credit-card","owner":"Payments team","tags":["pci"],"order":1}
            """;

    @Autowired
    MockMvc mvc;

    private static RequestPostProcessor from(String address) {
        return request -> {
            request.setRemoteAddr(address);
            return request;
        };
    }

    @Test
    void anyoneCanRead() throws Exception {
        mvc.perform(get("/api/wall/snapshot").with(from("192.168.0.5")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.environment").value("Local"))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Referrer-Policy", "no-referrer"));
    }

    @Test
    void lanClientsCannotChangeConfiguration() throws Exception {
        mvc.perform(put("/api/groups/grp_lan").with(from("192.168.0.5")).header(Operators.HEADER, "Ana")
                        .contentType(MediaType.APPLICATION_JSON).content(GROUP))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("access-denied"));
    }

    @Test
    void lanClientsMayAcknowledge() throws Exception {
        mvc.perform(post("/api/incidents/inc_missing/ack").with(from("192.168.0.5"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"by\":\"TV operator\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("not-found"));
    }

    @Test
    void changesNeedAnOperatorName() throws Exception {
        mvc.perform(put("/api/groups/grp_x").contentType(MediaType.APPLICATION_JSON).content(GROUP))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("operator-required"));
    }

    @Test
    void groupLifecycleFromLoopback() throws Exception {
        mvc.perform(put("/api/groups/grp_payments").header(Operators.HEADER, "Ana")
                        .contentType(MediaType.APPLICATION_JSON).content(GROUP))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("grp_payments"))
                .andExpect(jsonPath("$.updatedBy").value("Ana"));

        mvc.perform(get("/api/groups"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem("grp_payments")))
                .andExpect(jsonPath("$[0].status").value("UNKNOWN"));

        mvc.perform(get("/api/audit").param("action", "group."))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").value("group.save"))
                .andExpect(jsonPath("$[0].operator").value("Ana"));

        mvc.perform(delete("/api/groups/grp_payments").header(Operators.HEADER, "Ana"))
                .andExpect(status().isNoContent());
        mvc.perform(delete("/api/groups/grp_payments").header(Operators.HEADER, "Ana"))
                .andExpect(status().isNotFound());
    }

    @Test
    void accessEndpointTellsTheClientWhatItMayDo() throws Exception {
        mvc.perform(get("/api/access"))
                .andExpect(jsonPath("$.mode").value("edit"))
                .andExpect(jsonPath("$.client").value("loopback"));
        mvc.perform(get("/api/access").with(from("192.168.0.5")))
                .andExpect(jsonPath("$.mode").value("view-only"))
                .andExpect(jsonPath("$.client").value("lan"));
        mvc.perform(get("/api/access").with(from("8.8.8.8")))
                .andExpect(jsonPath("$.mode").value("view-only"))
                .andExpect(jsonPath("$.client").value("unknown"));
    }

    @Test
    void percentEncodedOperatorNameIsDecoded() throws Exception {
        mvc.perform(put("/api/groups/grp_utf8").header(Operators.HEADER, "Jo%C3%A3o%20Silva")
                        .contentType(MediaType.APPLICATION_JSON).content(GROUP))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updatedBy").value("João Silva"));
    }

    @Test
    void invalidGroupIsUnprocessable() throws Exception {
        mvc.perform(put("/api/groups/grp_bad").header(Operators.HEADER, "Ana")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"X\",\"color\":\"blue\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("invalid-config"))
                .andExpect(jsonPath("$.errors[0]").exists());
    }
}
