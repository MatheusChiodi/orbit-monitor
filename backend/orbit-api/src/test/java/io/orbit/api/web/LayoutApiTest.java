package io.orbit.api.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("BE-41 wall layouts by slug")
class LayoutApiTest {

    private static final String LAYOUT = """
            {"slug":"payments","name":"Payments team","blocks":[
              {"type":"hero","x":0,"y":0,"w":6,"h":4,"source":"grp_payments"},
              {"type":"table","x":6,"y":0,"w":6,"h":4,"source":"sel_queue","display":"table"}]}
            """;

    @Autowired
    MockMvc mvc;

    @Test
    @DisplayName("the built-in noc layout is served without configuration")
    void defaultLayout() throws Exception {
        mvc.perform(get("/api/layouts/noc").with(r -> {
                    r.setRemoteAddr("192.168.0.50");
                    return r;
                }))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("noc"))
                .andExpect(jsonPath("$.blocks[0].type").value("hero"));
        mvc.perform(get("/api/layouts/unknown")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("saved layouts are versioned and readable by slug; the TV cannot edit them")
    void saveAndRead() throws Exception {
        mvc.perform(put("/api/layouts/lay_pay").header(Operators.HEADER, "Ana")
                        .contentType(MediaType.APPLICATION_JSON).content(LAYOUT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1));
        mvc.perform(put("/api/layouts/lay_pay").header(Operators.HEADER, "Ana")
                        .contentType(MediaType.APPLICATION_JSON).content(LAYOUT))
                .andExpect(jsonPath("$.version").value(2));

        mvc.perform(get("/api/layouts/payments")).andExpect(jsonPath("$.blocks[1].source").value("sel_queue"));
        mvc.perform(put("/api/layouts/lay_pay").with(r -> {
                    r.setRemoteAddr("192.168.0.50");
                    return r;
                }).header(Operators.HEADER, "TV").contentType(MediaType.APPLICATION_JSON).content(LAYOUT))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("blocks that overflow the grid are rejected")
    void invalid() throws Exception {
        mvc.perform(put("/api/layouts/lay_bad").header(Operators.HEADER, "Ana").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slug\":\"bad\",\"name\":\"Bad\",\"blocks\":[{\"type\":\"hero\",\"x\":10,\"y\":0,\"w\":6,\"h\":2}]}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("invalid-config"));
    }
}
