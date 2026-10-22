package io.orbit.api.web;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("BE-11/12/13/14: catalog, saved queries, parameters and cost warning for the SQL editor")
class SqlEditorApiTest {

    private static final String URL = "jdbc:h2:mem:sql-editor-test;DB_CLOSE_DELAY=-1";

    @Autowired
    MockMvc mvc;

    @BeforeEach
    void connection() throws Exception {
        try (Connection c = DriverManager.getConnection(URL, "sa", "pw"); Statement st = c.createStatement()) {
            st.execute("CREATE TABLE IF NOT EXISTS ORDERS (ID INT, STATUS VARCHAR(10), AMOUNT DECIMAL(10,2))");
            st.execute("DELETE FROM ORDERS");
            st.execute("INSERT INTO ORDERS VALUES (1, 'PENDING', 10.5), (2, 'DONE', 3), (3, 'PENDING', 1)");
        }
        send(put("/api/connections/con_editor"), "{\"name\":\"Editor\",\"jdbcUrl\":\"" + URL
                + "\",\"username\":\"sa\",\"password\":\"pw\",\"poolSize\":1}").andExpect(status().isOk());
    }

    private ResultActions send(MockHttpServletRequestBuilder request, String body) throws Exception {
        return mvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    @DisplayName("BE-13: the catalog lists user tables with their columns, never rows")
    void catalog() throws Exception {
        mvc.perform(get("/api/connections/con_editor/catalog")).andExpect(status().isOk())
                .andExpect(jsonPath("$.connectionId").value("con_editor"))
                .andExpect(jsonPath("$.tables[?(@.name == 'ORDERS')].columns[*]", hasItem("STATUS")))
                .andExpect(jsonPath("$.tables[?(@.name == 'ORDERS')].columnTypes[*]", hasItem("INTEGER")))
                .andExpect(jsonPath("$.tables[?(@.schema == 'INFORMATION_SCHEMA')]", hasSize(0)));
        mvc.perform(get("/api/connections/missing/catalog")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("BE-12: saved queries are created, listed per connection, read and deleted")
    void savedQueries() throws Exception {
        send(put("/api/query-catalog/q_pending"), "{\"name\":\"Pending orders\",\"connectionId\":\"con_editor\","
                + "\"sql\":\"SELECT COUNT(*) AS N FROM ORDERS WHERE STATUS = :status\",\"description\":\"queue\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.updatedBy").value("loopback"));
        mvc.perform(get("/api/query-catalog").param("connectionId", "con_editor")).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == 'q_pending')].name", hasItem("Pending orders")));
        mvc.perform(get("/api/query-catalog/q_pending")).andExpect(jsonPath("$.description").value("queue"));
        send(put("/api/query-catalog/q_bad"), "{\"name\":\"Bad\",\"connectionId\":\"con_editor\",\"sql\":\"DELETE FROM ORDERS\"}")
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(delete("/api/query-catalog/q_pending"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/query-catalog/q_pending")).andExpect(status().isNotFound());
        mvc.perform(get("/api/audit").param("action", "query-catalog.")).andExpect(status().isOk())
                .andExpect(jsonPath("$[*].action", hasItem("query-catalog.save")));
    }

    @Test
    @DisplayName("BE-11/BE-14: preview binds :params and says whether the query is too slow for the interval")
    void previewWithParametersAndCost() throws Exception {
        send(post("/api/monitors/preview"), "{\"type\":\"SQL\",\"connectionId\":\"con_editor\",\"sql\":"
                + "\"SELECT COUNT(*) AS N FROM ORDERS WHERE STATUS = :status\",\"parameters\":{\"status\":\"PENDING\"},"
                + "\"intervalSeconds\":60}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].N").value(2))
                .andExpect(jsonPath("$.cost.level").value("NONE"))
                .andExpect(jsonPath("$.cost.suggestedIntervalSeconds").value(60))
                .andExpect(jsonPath("$.cost.message").value("The query is fast enough for this interval"));
        send(post("/api/monitors/preview"), "{\"type\":\"SQL\",\"connectionId\":\"con_editor\",\"sql\":"
                + "\"SELECT COUNT(*) AS N FROM ORDERS WHERE STATUS = :status\"}")
                .andExpect(status().isUnprocessableEntity());
    }
}
