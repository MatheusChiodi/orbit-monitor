package io.orbit.api.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("CORE-20: the built frontend is served from static/ in the jar")
class StaticFrontendTest {

    @Autowired
    MockMvc mvc;

    @Test
    @DisplayName("the console is the welcome page and every wall layout path serves wall.html")
    void routes() throws Exception {
        mvc.perform(get("/")).andExpect(status().isOk()).andExpect(forwardedUrl("index.html"));
        mvc.perform(get("/wall")).andExpect(status().isOk()).andExpect(forwardedUrl("/wall.html"));
        mvc.perform(get("/wall/noc")).andExpect(status().isOk()).andExpect(forwardedUrl("/wall.html"));
        mvc.perform(get("/wall/../api")).andExpect(status().is4xxClientError());
    }
}
