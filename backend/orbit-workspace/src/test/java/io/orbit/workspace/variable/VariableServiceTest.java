package io.orbit.workspace.variable;

import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigMapper;
import io.orbit.config.ConfigValidationException;
import io.orbit.security.vault.MasterKey;
import io.orbit.security.vault.SecretCipher;
import io.orbit.security.vault.SecretResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-39 orbit.variables.json store")
class VariableServiceTest {

    @TempDir
    Path dir;
    private SecretResolver vault;
    private VariableService service;

    @BeforeEach
    void setUp() {
        vault = new SecretResolver(new SecretCipher(MasterKey.loadOrCreate(dir.resolve("master.key"))),
                Map.of("ORBIT_TEST_TOKEN", "env-token")::get);
        service = open();
    }

    private VariableService open() {
        return new VariableService(new ConfigFile<>(dir.resolve("config"), "variables", VariableService.Variable.class,
                ConfigMapper.create(), VariableService.VALIDATOR), vault);
    }

    @Test
    @DisplayName("plain variables are stored and shown; vault values are sealed and never shown")
    void storesAndMasks() throws Exception {
        service.save(new VariableService.Input("var_env", "env", VariableService.Kind.VAR, "prod", "Environment"), "Ana");
        VariableService.View secret = service.save(new VariableService.Input("var_token", "apiToken",
                VariableService.Kind.VAULT, "tok-123", null), "Ana");

        assertThat(secret.value()).isEqualTo("•••• (vault)");
        assertThat(secret.updatedBy()).isEqualTo("Ana");
        assertThat(service.list()).extracting(VariableService.View::name).containsExactly("apiToken", "env");
        String file = Files.readString(dir.resolve("config/orbit.variables.json"));
        assertThat(file).doesNotContain("tok-123").contains("\"enc\"");
        assertThat(open().resolver().resolve("${var:env}/${vault:apiToken}")).isEqualTo("prod/tok-123");
    }

    @Test
    @DisplayName("editing a vault variable without a new value keeps the sealed secret")
    void keepsSecretOnEdit() {
        service.save(new VariableService.Input("var_token", "apiToken", VariableService.Kind.VAULT, "tok-123", null), "Ana");
        service.save(new VariableService.Input("var_token", "apiToken", VariableService.Kind.VAULT, null, "New note"), "Bia");

        assertThat(service.resolver().resolve("${vault:apiToken}")).isEqualTo("tok-123");
        assertThat(service.list().get(0).description()).isEqualTo("New note");
    }

    @Test
    @DisplayName("vault variables may reference an environment variable")
    void envReference() {
        VariableService.View view = service.save(new VariableService.Input("var_env_tok", "envToken",
                VariableService.Kind.VAULT, "${env:ORBIT_TEST_TOKEN}", null), "Ana");

        assertThat(view.value()).isEqualTo("${env:ORBIT_TEST_TOKEN}");
        assertThat(service.resolver().resolve("${vault:envToken}")).isEqualTo("env-token");
    }

    @Test
    @DisplayName("names are unique and well formed; a new vault variable needs a value")
    void validation() {
        service.save(new VariableService.Input("var_a", "env", VariableService.Kind.VAR, "prod", null), "Ana");

        assertThatThrownBy(() -> service.save(new VariableService.Input("var_b", "env", VariableService.Kind.VAR, "x",
                null), "Ana")).isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> service.save(new VariableService.Input("var_c", "1bad name", VariableService.Kind.VAR,
                "x", null), "Ana")).isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> service.save(new VariableService.Input("var_d", "token", VariableService.Kind.VAULT,
                null, null), "Ana")).isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> service.save(new VariableService.Input("var_e", "plain", VariableService.Kind.VAR,
                null, null), "Ana")).isInstanceOf(ConfigValidationException.class);
    }

    @Test
    @DisplayName("delete removes the variable from resolution")
    void delete() {
        service.save(new VariableService.Input("var_a", "env", VariableService.Kind.VAR, "prod", null), "Ana");

        assertThat(service.delete("var_a")).isTrue();
        assertThat(service.delete("var_a")).isFalse();
        assertThatThrownBy(() -> service.resolver().resolve("${var:env}")).isInstanceOf(IllegalArgumentException.class);
    }
}
