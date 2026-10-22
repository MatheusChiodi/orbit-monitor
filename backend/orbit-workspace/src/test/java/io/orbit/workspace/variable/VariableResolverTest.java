package io.orbit.workspace.variable;

import io.orbit.security.vault.MasterKey;
import io.orbit.security.vault.SecretCipher;
import io.orbit.security.vault.SecretResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-39 workspace variables")
class VariableResolverTest {

    @TempDir
    Path dir;
    private VariableResolver resolver;

    @BeforeEach
    void setUp() {
        SecretResolver vault = new SecretResolver(new SecretCipher(MasterKey.loadOrCreate(dir.resolve("master.key"))),
                name -> null);
        resolver = new VariableResolver(Map.of("env", "prod", "store", "SP01"),
                Map.of("apiToken", vault.seal("tok-123")), vault);
    }

    @Test
    @DisplayName("replaces variables and vault references")
    void resolves() {
        assertThat(resolver.resolve("https://${var:env}.example.com/stores/${var:store}?t=${vault:apiToken}"))
                .isEqualTo("https://prod.example.com/stores/SP01?t=tok-123");
    }

    @Test
    @DisplayName("masked resolution never shows vault values")
    void masked() {
        assertThat(resolver.resolveMasked("Bearer ${vault:apiToken} on ${var:env}")).isEqualTo("Bearer •••• on prod");
    }

    @Test
    @DisplayName("unknown names fail with the name")
    void unknown() {
        assertThatThrownBy(() -> resolver.resolve("${var:missing}"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("missing");
    }

    @Test
    @DisplayName("text without references is untouched")
    void plain() {
        assertThat(resolver.resolve("SELECT 1 FROM dual")).isEqualTo("SELECT 1 FROM dual");
    }
}
