package io.orbit.api.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"orbit.rate-limit.requests-per-minute=60", "orbit.rate-limit.burst=2"})
@AutoConfigureMockMvc
@DisplayName("BE-47 rate limiting on the API")
class RateLimitApiTest {

    @Autowired
    MockMvc mvc;

    @Test
    @DisplayName("too many requests from one IP get 429 Problem Details with Retry-After")
    void tooManyRequests() throws Exception {
        for (int i = 0; i < 2; i++) {
            mvc.perform(get("/api/groups").with(r -> {
                r.setRemoteAddr("192.168.0.77");
                return r;
            })).andExpect(status().isOk());
        }
        mvc.perform(get("/api/groups").with(r -> {
                    r.setRemoteAddr("192.168.0.77");
                    return r;
                }))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.code").value("rate-limited"));
        mvc.perform(get("/api/groups")).andExpect(status().isOk());
    }
}
