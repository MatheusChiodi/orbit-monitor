package io.orbit.api.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("BE-59: server-rendered status page at /status/{slug}")
class StatusPageHtmlTest {

    @Autowired
    MockMvc mvc;

    private static RequestPostProcessor from(String address) {
        return request -> {
            request.setRemoteAddr(address);
            return request;
        };
    }

    private void create(String id, String slug, boolean pub, String title) throws Exception {
        mvc.perform(put("/api/groups/grp_html_pay").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Payments <api>\",\"color\":\"#3b9eff\"}")).andExpect(status().isOk());
        mvc.perform(post("/api/status-pages").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":\"%s\",\"slug\":\"%s\",\"title\":\"%s\",\"pub\":%s,\"groupIds\":[\"grp_html_pay\"]}"
                                .formatted(id, slug, title, pub)))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("a public page is plain HTML for anyone, escaped, cached and with security headers")
    void publicPage() throws Exception {
        create("stp_html_pub", "html-public", true, "Acme <script>alert(1)</script> status");
        mvc.perform(get("/status/html-public").with(from("192.168.0.5")))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andExpect(header().string("Cache-Control", "public, max-age=30"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().exists("Content-Security-Policy"))
                .andExpect(content().string(containsString("<html lang=\"en\">")))
                .andExpect(content().string(containsString("Acme &lt;script&gt;alert(1)&lt;/script&gt; status")))
                .andExpect(content().string(not(containsString("<script>"))))
                .andExpect(content().string(containsString("Payments &lt;api&gt;")))
                .andExpect(content().string(not(containsString("grp_html_pay"))))
                .andExpect(content().string(not(containsString("noindex"))));
    }

    @Test
    @DisplayName("the page follows Accept-Language")
    void translated() throws Exception {
        create("stp_html_pt", "html-pt", true, "Status");
        mvc.perform(get("/status/html-pt").header("Accept-Language", "pt-BR"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("<html lang=\"pt-BR\">")))
                .andExpect(content().string(containsString("Atualizado")));
    }

    @Test
    @DisplayName("an internal page is hidden from view-only clients and not indexed")
    void internalPage() throws Exception {
        create("stp_html_int", "html-internal", false, "Internal");
        mvc.perform(get("/status/html-internal").with(from("192.168.0.5")))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML));
        mvc.perform(get("/status/html-internal"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, max-age=30"))
                .andExpect(content().string(containsString("noindex")));
    }

    @Test
    @DisplayName("an unknown slug is a 404 page")
    void unknown() throws Exception {
        mvc.perform(get("/status/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML));
    }
}
