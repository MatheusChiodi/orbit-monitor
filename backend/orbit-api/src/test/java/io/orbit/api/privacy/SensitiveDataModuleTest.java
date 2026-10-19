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
}
