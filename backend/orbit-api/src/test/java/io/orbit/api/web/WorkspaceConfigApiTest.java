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
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("BE-39 variables, BE-40 themes and defaults, CORE-07 workspaces over the API")
class WorkspaceConfigApiTest {

    static final String THEME = """
            {"id":"%s","name":"Harbor","mode":"dark","category":"custom",
             "colors":{"bg":"#07090d","s1":"#0d1117","s2":"#131922","s3":"#1a212c","line":"#ffffff14",
                       "line2":"#ffffff24","text":"%s","muted":"#8b96a6","dim":"#6b7686","ok":"#22c55e",
                       "warn":"#f5a524","down":"#ff3b4f","info":"#3b9eff","accent":"#3b9eff"},
             "chart":["#3b9eff","#22c55e","#f5a524","#ff3b4f","#a78bfa","#2dd4bf","#f472b6","#facc15"],
             "syntax":{"keyword":"#c792ea","string":"#c3e88d","number":"#f78c6c","comment":"#6b7686",
                       "function":"#82aaff","operator":"#89ddff","identifier":"#eef2f7"},
             "fx":{"from":"#3b9eff","to":"#a78bfa","glow":"#3b9eff"}}
            """;

    @Autowired
    MockMvc mvc;

    static RequestPostProcessor from(String address) {
        return request -> {
            request.setRemoteAddr(address);
            return request;
        };
    }

    private ResultActions send(MockHttpServletRequestBuilder request, String body) throws Exception {
        return mvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    @DisplayName("variables: vault values are sealed and never returned or audited")
    void variables() throws Exception {
        send(post("/api/variables"), "{\"name\":\"apiKey\",\"kind\":\"vault\",\"value\":\"s3cr3t-value\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("var_apikey"))
                .andExpect(jsonPath("$.kind").value("vault"))
                .andExpect(jsonPath("$.value").value("•••• (vault)"));
        send(put("/api/variables/var_region"), "{\"name\":\"region\",\"value\":\"south\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.kind").value("var"));

        mvc.perform(get("/api/variables").with(from("192.168.0.5")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.items[*].name", hasItem("region")))
                .andExpect(content().string(not(containsString("s3cr3t-value"))))
                .andExpect(content().string(not(containsString("\"enc\""))));
        mvc.perform(get("/api/audit").param("action", "variable."))
                .andExpect(content().string(not(containsString("s3cr3t-value"))));
        mvc.perform(put("/api/variables/var_lan").with(from("192.168.0.5"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"lan\",\"value\":\"x\"}"))
                .andExpect(status().isForbidden());
        send(post("/api/variables"), "{\"name\":\"bad name!\",\"value\":\"x\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("invalid-config"));
        mvc.perform(delete("/api/variables/var_region"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("themes: readable themes are saved, unreadable ones refused with the failing pairs")
    void themes() throws Exception {
        send(post("/api/themes"), THEME.formatted("harbor-api", "#eef2f7"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.updatedBy").value("loopback"))
                .andExpect(jsonPath("$.category").value("custom"));
        send(post("/api/themes"), THEME.formatted("harbor-api", "#eef2f7")).andExpect(status().isConflict());
        mvc.perform(get("/api/themes").with(from("192.168.0.5")))
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.items[*].id", hasItem("harbor-api")));
        send(put("/api/themes/harbor-api"), THEME.formatted("ignored", "#1a1f26"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors[0]").value(containsString("text on bg")));
        mvc.perform(delete("/api/themes/harbor-api")).andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("defaults: anyone reads them, only editors change them")
    void defaults() throws Exception {
        mvc.perform(get("/api/settings/defaults").with(from("192.168.0.5")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.theme").exists())
                .andExpect(jsonPath("$.scale").exists());
        send(put("/api/settings/defaults"), "{\"theme\":\"nord\",\"animation\":\"minimal\",\"density\":\"compact\","
                + "\"locale\":\"pt-BR\",\"scale\":\"5m\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.animation").value("minimal"));
        mvc.perform(get("/api/settings/defaults")).andExpect(jsonPath("$.scale").value("5m"));
        send(put("/api/settings/defaults"), "{\"animation\":\"wild\"}").andExpect(status().isUnprocessableEntity());
        mvc.perform(put("/api/settings/defaults").with(from("192.168.0.5"))
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
        send(put("/api/settings/defaults"), "{}").andExpect(jsonPath("$.animation").value("standard"));
    }

    @Test
    @DisplayName("workspaces: CRUD and a group in one workspace only")
    void workspaces() throws Exception {
        send(post("/api/workspaces"), "{\"id\":\"wks_api_prod\",\"name\":\"Production\",\"groupIds\":[\"grp_api_pay\"]}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.updatedBy").value("loopback"));
        send(put("/api/workspaces/wks_api_stg"), "{\"name\":\"Staging\",\"groupIds\":[\"grp_api_pay\"]}")
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(get("/api/workspaces")).andExpect(jsonPath("$.items[*].id", hasItem("wks_api_prod")));
        mvc.perform(get("/api/workspaces/wks_api_prod")).andExpect(jsonPath("$.name").value("Production"));
        mvc.perform(delete("/api/workspaces/wks_api_prod"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/workspaces/wks_api_prod")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("groups: PUT /api/groups/order persists the order and the monitor order")
    void groupOrder() throws Exception {
        String group = "{\"name\":\"%s\",\"color\":\"#3b9eff\",\"order\":%d}";
        send(put("/api/groups/grp_ord_a"), group.formatted("Ord A", 1)).andExpect(status().isOk());
        send(put("/api/groups/grp_ord_b"), group.formatted("Ord B", 2)).andExpect(status().isOk());

        send(put("/api/groups/order"), "{\"groupIds\":[\"grp_ord_b\",\"grp_ord_a\"],\"monitors\":{\"grp_ord_b\":[]}}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("grp_ord_b"))
                .andExpect(jsonPath("$[1].id").value("grp_ord_a"));
        send(put("/api/groups/order"), "{\"groupIds\":[\"grp_ord_b\"],\"monitors\":{\"grp_ord_b\":[\"mon_missing\"]}}")
                .andExpect(status().isUnprocessableEntity());
        send(put("/api/groups/order"), "{\"groupIds\":[\"grp_nope\"]}").andExpect(status().isUnprocessableEntity());
        mvc.perform(put("/api/groups/order").with(from("192.168.0.5"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"groupIds\":[]}")).andExpect(status().isForbidden());
    }
}
