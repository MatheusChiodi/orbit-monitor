package io.orbit.api.wall;

import io.orbit.api.web.Operators;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "orbit.config-dir=${java.io.tmpdir}/orbit-test/${random.uuid}/branding-config")
@AutoConfigureMockMvc
@DisplayName("FE-10 backend: the wall snapshot carries the workspace branding from orbit.settings.json")
class WallBrandingTest {

    @Autowired
    MockMvc mvc;

    @Test
    @DisplayName("without branding the field is absent; after saving it the snapshot has name and sanitized logo")
    void branding() throws Exception {
        mvc.perform(get("/api/wall/snapshot")).andExpect(status().isOk())
                .andExpect(jsonPath("$.branding").doesNotExist());

        mvc.perform(put("/api/settings").header(Operators.HEADER, "Ana").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"locale\":\"en\",\"branding\":{\"name\":\"Acme NOC\",\"logoSvg\":"
                                + "\"<svg xmlns='http://www.w3.org/2000/svg' onload='x()'><circle r='4'/></svg>\"}}"))
                .andExpect(status().isOk());

        mvc.perform(get("/api/wall/snapshot")).andExpect(status().isOk())
                .andExpect(jsonPath("$.branding.name").value("Acme NOC"))
                .andExpect(jsonPath("$.branding.logoSvg", containsString("<circle")))
                .andExpect(jsonPath("$.branding.logoSvg", not(containsString("onload"))));
    }
}
