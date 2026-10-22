package io.orbit.api.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static io.orbit.api.web.WorkspaceConfigApiTest.from;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("BE-42 status pages: editors manage, public pages for everyone, cached, no personal data")
class StatusPagesApiTest {

    @Autowired
    MockMvc mvc;

    private void create(String id, String slug, boolean pub) throws Exception {
        mvc.perform(put("/api/groups/grp_stp_pay").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Payments\",\"color\":\"#3b9eff\"}")).andExpect(status().isOk());
        mvc.perform(post("/api/status-pages").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":\"%s\",\"slug\":\"%s\",\"title\":\"Example status\",\"pub\":%s,\"groupIds\":[\"grp_stp_pay\"]}"
                                .formatted(id, slug, pub)))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("a public page is readable from the LAN with cache headers and an ETag")
    void publicPage() throws Exception {
        create("stp_api_public", "api-status", true);

        MvcResult result = mvc.perform(get("/api/status/api-status").with(from("192.168.0.5")))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "public, max-age=30"))
                .andExpect(header().exists("ETag"))
                .andExpect(jsonPath("$.title").value("Example status"))
                .andExpect(jsonPath("$.groups[0].name").value("Payments"))
                .andExpect(jsonPath("$.groups[0].state").value("UNKNOWN"))
                .andExpect(content().string(not(containsString("Ana"))))
                .andExpect(content().string(not(containsString("grp_stp_pay"))))
                .andReturn();
        String etag = result.getResponse().getHeader("ETag");

        mvc.perform(get("/api/status/api-status").with(from("192.168.0.5")).header("If-None-Match", etag))
                .andExpect(status().isNotModified());
    }

    @Test
    @DisplayName("internal pages exist only for editors")
    void internalPage() throws Exception {
        create("stp_api_internal", "api-internal", false);

        mvc.perform(get("/api/status/api-internal").with(from("192.168.0.5"))).andExpect(status().isNotFound());
        mvc.perform(get("/api/status/api-internal"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, max-age=30"));
        mvc.perform(get("/api/status-pages").with(from("192.168.0.5")))
                .andExpect(jsonPath("$.items[*].slug", not(hasItem("api-internal"))));
        mvc.perform(get("/api/status-pages")).andExpect(jsonPath("$.items[*].slug", hasItem("api-internal")));
    }

    @Test
    @DisplayName("only editors manage definitions; slugs are validated")
    void management() throws Exception {
        mvc.perform(post("/api/status-pages").with(from("192.168.0.5"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"id\":\"stp_lan\",\"slug\":\"lan\",\"title\":\"x\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/status-pages/stp_bad").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slug\":\"Bad Slug\",\"title\":\"x\"}"))
                .andExpect(status().isUnprocessableEntity());
        create("stp_api_del", "api-del", true);
        mvc.perform(delete("/api/status-pages/stp_api_del"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/status/api-del")).andExpect(status().isNotFound());
    }
}
