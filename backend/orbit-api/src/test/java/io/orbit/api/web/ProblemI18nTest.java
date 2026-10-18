package io.orbit.api.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("CORE-15 API errors in English (default) and Brazilian Portuguese")
class ProblemI18nTest {

    @Autowired
    MockMvc mvc;

    @Test
    void operatorRequiredInBothLanguages() throws Exception {
        mvc.perform(put("/api/groups/grp_x").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"X\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("operator-required"))
                .andExpect(jsonPath("$.title").value("Operator name required"));
        mvc.perform(put("/api/groups/grp_x").header("Accept-Language", "pt-BR")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"X\"}"))
                .andExpect(jsonPath("$.code").value("operator-required"))
                .andExpect(jsonPath("$.title").value("Nome do operador obrigatório"))
                .andExpect(jsonPath("$.detail", containsString("X-Orbit-Operator")));
    }

    @Test
    void domainMessagesAreTranslatedWithArguments() throws Exception {
        String body = "{\"expression\":\"[NOPE] == 1\"}";
        mvc.perform(post("/api/conditions/validate").header(Operators.HEADER, "Ana")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(jsonPath("$.detail").value("Unknown placeholder: [NOPE]"));
        mvc.perform(post("/api/conditions/validate").header(Operators.HEADER, "Ana").header("Accept-Language", "pt-BR")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(jsonPath("$.code").value("invalid-condition"))
                .andExpect(jsonPath("$.detail").value("Placeholder desconhecido: [NOPE]"));
    }

    @Test
    void accessDeniedInBothLanguages() throws Exception {
        mvc.perform(put("/api/groups/grp_x").with(r -> {
                    r.setRemoteAddr("192.168.0.9");
                    return r;
                }).header("Accept-Language", "pt-BR,pt;q=0.9").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("access-denied"))
                .andExpect(jsonPath("$.title").value("Acesso negado"));
    }

    @Test
    void unsupportedLanguageFallsBackToEnglish() throws Exception {
        mvc.perform(put("/api/groups/grp_x").header("Accept-Language", "fr-FR")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"X\"}"))
                .andExpect(jsonPath("$.title").value("Operator name required"));
    }
}
