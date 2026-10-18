package io.orbit.monitor.http;

import io.orbit.monitor.condition.Placeholder;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class HttpEvaluationContextTest {

    private static final String BODY = """
            {"status":"UP","fila":{"tamanho":42},"itens":[{"valor":1.5},{"valor":2}]}
            """;

    private final HttpResponseSnapshot response = new HttpResponseSnapshot(
            200, 312L, BODY, Map.of("Content-Type", List.of("application/json")), 45);

    private final HttpEvaluationContext ctx = new HttpEvaluationContext(response);

    @Test
    void statusTempoECertificado() {
        assertThat(ctx.resolve(Placeholder.STATUS, null)).contains(200);
        assertThat(ctx.resolve(Placeholder.RESPONSE_TIME, null)).contains(312L);
        assertThat(ctx.resolve(Placeholder.CERT_DAYS_LEFT, null)).contains(45);
    }

    @Test
    void bodySemCaminhoEhOTextoInteiro() {
        assertThat(ctx.resolve(Placeholder.BODY, null)).contains(BODY);
    }

    @Test
    void bodyComCaminhoUsaJsonPath() {
        assertThat(ctx.resolve(Placeholder.BODY, "status")).contains("UP");
        assertThat(ctx.resolve(Placeholder.BODY, "fila.tamanho")).contains(42);
        assertThat(ctx.resolve(Placeholder.BODY, "$.itens[0].valor")).contains(1.5);
    }

    @Test
    void caminhoInexistenteOuBodyNaoJsonNaoTemValor() {
        assertThat(ctx.resolve(Placeholder.BODY, "nao.existe")).isEmpty();
        var texto = new HttpEvaluationContext(new HttpResponseSnapshot(200, 1L, "pong", Map.of(), null));
        assertThat(texto.resolve(Placeholder.BODY, "status")).isEmpty();
        assertThat(texto.resolve(Placeholder.CERT_DAYS_LEFT, null)).isEmpty();
    }

    @Test
    void headerSemDiferenciarCaixa() {
        assertThat(ctx.resolve(Placeholder.HEADER, "content-type")).contains("application/json");
        assertThat(ctx.resolve(Placeholder.HEADER, "x-nada")).isEmpty();
    }

    @Test
    void placeholdersSqlNaoExistemNoHttp() {
        assertThat(ctx.resolve(Placeholder.ROWS, null)).isEmpty();
    }
}
