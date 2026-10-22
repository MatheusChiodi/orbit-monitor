package io.orbit.api.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext
@DisplayName("BE-35 orbit.notification-templates.json API with preview")
class NotificationTemplateApiTest {

    // Public test card number (never a real card).
    private static final String TEST_PAN = "4111111111111111";

    @Autowired
    MockMvc mvc;

    private ResultActions send(MockHttpServletRequestBuilder builder, String body) throws Exception {
        return mvc.perform(builder.header(Operators.HEADER, "Ana").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    @DisplayName("lists defaults, saves an override, previews it redacted and resets it")
    void lifecycle() throws Exception {
        mvc.perform(get("/api/notification-templates"))
                .andExpect(jsonPath("$.templates[?(@.id == 'incident.down')].title.pt-BR").value("{{monitor}} está fora do ar"))
                .andExpect(jsonPath("$.templates[?(@.id == 'incident.down')].custom").value(false))
                .andExpect(jsonPath("$.variables").isArray());

        send(put("/api/notification-templates/incident.down"), "{\"title\":{\"en\":\"[P1] {{monitor}}\"}}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.custom").value(true))
                .andExpect(jsonPath("$.title.en").value("[P1] {{monitor}}"))
                .andExpect(jsonPath("$.title.pt-BR").value("{{monitor}} está fora do ar"));
        send(put("/api/notification-templates/incident.nope"), "{\"title\":{\"en\":\"x\"}}")
                .andExpect(status().isUnprocessableEntity());
        send(put("/api/notification-templates/incident.down"), "{\"title\":{\"fr\":\"x\"}}")
                .andExpect(status().isUnprocessableEntity());

        send(post("/api/notification-templates/incident.down/preview"), "{\"locale\":\"en\",\"variables\":"
                + "{\"monitor\":\"Cards\",\"detail\":\"PAN " + TEST_PAN + "\"}}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("[P1] Cards"))
                .andExpect(jsonPath("$.text").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString(TEST_PAN))));
        send(post("/api/notification-templates/incident.down/preview"), "{\"locale\":\"pt-BR\"}")
                .andExpect(jsonPath("$.title").value("Fila de pagamentos está fora do ar"));

        mvc.perform(delete("/api/notification-templates/incident.down").header(Operators.HEADER, "Ana"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/notification-templates"))
                .andExpect(jsonPath("$.templates[?(@.id == 'incident.down')].custom").value(false));
        mvc.perform(delete("/api/notification-templates/incident.down").header(Operators.HEADER, "Ana"))
                .andExpect(status().isNotFound());
    }
}
