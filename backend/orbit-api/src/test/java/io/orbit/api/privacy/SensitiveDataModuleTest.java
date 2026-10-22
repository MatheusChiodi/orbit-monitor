package io.orbit.api.privacy;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.common.privacy.Sensitive;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.monitor.http.HttpResponseSnapshot;
import io.orbit.monitor.sql.ColumnType;
import io.orbit.monitor.sql.ResultColumn;
import io.orbit.monitor.sql.ResultPayload;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CORE-16 Jackson serialization guard")
class SensitiveDataModuleTest {

    // Public test card number (never a real card).
    private static final String TEST_PAN = "4111111111111111";
    private final ObjectMapper json = new ObjectMapper().registerModule(new SensitiveDataModule(new SensitiveDataRedactor()));

    record Customer(String id, @Sensitive String document) {
    }

    @Test
    @DisplayName("an unmasked ResultPayload is masked on serialization")
    void resultPayload() throws Exception {
        var payload = new ResultPayload(List.of(new ResultColumn("CARD_NUMBER", ColumnType.TEXT, "VARCHAR")),
                List.of(List.of(TEST_PAN)), 1L, false);
        assertThat(json.writeValueAsString(payload)).doesNotContain(TEST_PAN).contains("1111");
    }

    @Test
    @DisplayName("an unmasked HTTP body is masked on serialization")
    void httpBody() throws Exception {
        var response = new HttpResponseSnapshot(200, 1L, "{\"pan\":\"" + TEST_PAN + "\"}", Map.of(), null);
        assertThat(json.writeValueAsString(response)).doesNotContain(TEST_PAN);
    }

    @Test
    @DisplayName("@Sensitive fields are masked")
    void annotated() throws Exception {
        assertThat(json.writeValueAsString(new Customer("c1", "529.982.247-25"))).doesNotContain("529.982.247")
                .contains("c1");
    }

    record ErrorView(String monitorId, String error, List<String> notes, Map<String, Object> row) {
    }

    @Test
    @DisplayName("a card number in any plain string, list item, map key or map value is masked")
    void plainStrings() throws Exception {
        var view = new ErrorView("mon_1", "Data truncation: value '" + TEST_PAN + "'",
                List.of("order 7 " + TEST_PAN), Map.of(TEST_PAN, "x", "note", TEST_PAN));

        String out = json.writeValueAsString(view);

        assertThat(out).doesNotContain(TEST_PAN).contains("mon_1", "•••• •••• •••• 1111");
        assertThat(json.writeValueAsString(TEST_PAN)).doesNotContain(TEST_PAN);
    }

    @Test
    @DisplayName("plain strings keep e-mails and other configuration values untouched")
    void plainStringsKeepNonCardData() throws Exception {
        var view = new ErrorView("mon_1", "ops@example.com", List.of("2026-10-18T10:00:00Z"), Map.of("n", "347"));

        assertThat(json.writeValueAsString(view)).contains("ops@example.com", "2026-10-18T10:00:00Z", "347");
    }
}
