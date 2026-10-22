package io.orbit.api.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static io.orbit.api.web.WorkspaceConfigApiTest.from;
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
@DisplayName("BE-51 customization and terminology over the API")
class CustomizationApiTest {

    @Autowired
    MockMvc mvc;

    private ResultActions send(MockHttpServletRequestBuilder request, String body) throws Exception {
        return mvc.perform(request.header(Operators.HEADER, "Ana").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    @DisplayName("scopes are saved by editors and resolved workspace < layout < instance for everyone")
    void scopes() throws Exception {
        send(put("/api/customization/workspace"), "{\"values\":{\"card.monitor.clickAction\":\"expand\",\"a.b\":1}}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("workspace"))
                .andExpect(jsonPath("$.updatedBy").value("Ana"));
        send(put("/api/customization/layout/api-noc"), "{\"values\":{\"card.monitor.clickAction\":\"none\"}}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("layout:api-noc"));

        mvc.perform(get("/api/customization/resolve").param("layout", "api-noc").with(from("192.168.0.5")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.values['card.monitor.clickAction']").value("none"))
                .andExpect(jsonPath("$.values['a.b']").value(1));
        mvc.perform(get("/api/customization")).andExpect(jsonPath("$.items[*].id", hasItem("layout:api-noc")));
        mvc.perform(put("/api/customization/workspace").with(from("192.168.0.5")).header(Operators.HEADER, "TV")
                .contentType(MediaType.APPLICATION_JSON).content("{\"values\":{}}")).andExpect(status().isForbidden());
        send(put("/api/customization/workspace"), "{\"values\":{\"privacy.showFullPan\":true}}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("invalid-config"));
        mvc.perform(delete("/api/customization/layout/api-noc").header(Operators.HEADER, "Ana"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/customization/layout/api-noc")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("profiles export as a portable file and import under a new id")
    void profiles() throws Exception {
        send(put("/api/customization/profile/api-night"), "{\"name\":\"Night shift\",\"values\":{\"wall.dim\":true}}")
                .andExpect(status().isOk());

        String exported = mvc.perform(get("/api/customization/profiles/api-night/export"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"orbit-profile-api-night.json\""))
                .andExpect(jsonPath("$.format").value("orbit.customization-profile"))
                .andReturn().getResponse().getContentAsString();

        send(post("/api/customization/profiles/api-night-copy/import"), exported)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("profile:api-night-copy"))
                .andExpect(jsonPath("$.values['wall.dim']").value(true));
        send(post("/api/customization/profiles/api-x/import"), "{\"format\":\"other\",\"version\":1}")
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("terminology per locale; markup and unknown locales are refused")
    void terminology() throws Exception {
        send(put("/api/terminology/pt-BR"), "{\"terms\":{\"status.DOWN\":\"Fora do ar\"}}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("pt-BR"));
        mvc.perform(get("/api/terminology/pt-BR").with(from("192.168.0.5")))
                .andExpect(jsonPath("$.terms['status.DOWN']").value("Fora do ar"));
        mvc.perform(get("/api/terminology/en")).andExpect(jsonPath("$.locale").value("en"));
        mvc.perform(get("/api/terminology")).andExpect(jsonPath("$.items[*].id", hasItem("pt-BR")));
        send(put("/api/terminology/en"), "{\"terms\":{\"status.DOWN\":\"<b>Off</b>\"}}")
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(get("/api/terminology/fr")).andExpect(status().isBadRequest());
        mvc.perform(delete("/api/terminology/pt-BR").header(Operators.HEADER, "Ana")).andExpect(status().isNoContent());
    }
}
