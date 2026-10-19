package io.orbit.probe.multistep;

import io.orbit.monitor.http.HttpResponseSnapshot;
import io.orbit.probe.http.HttpProbe;
import io.orbit.probe.http.HttpProbeException;
import io.orbit.probe.http.HttpProbeRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@Tag("pending")
@DisplayName("BE-07 multi-step HTTP")
class MultiStepHttpProbeTest {

    private final HttpProbe http = mock(HttpProbe.class);
    private final MultiStepHttpProbe probe = new MultiStepHttpProbe(http);

    private static HttpResponseSnapshot response(int status, String body) {
        return new HttpResponseSnapshot(status, 20, body, Map.of(), null);
    }

    @Test
    @DisplayName("variables extracted in one step are used by the next")
    void chainsVariables() {
        when(http.execute(any())).thenReturn(response(200, "{\"access_token\":\"t-123\"}"), response(200, "{\"ok\":true}"));

        MultiStepHttpProbe.Result r = probe.execute(List.of(
                new MultiStepHttpProbe.Step("login", "POST", "https://api.example.com/token", Map.of(), "{}",
                        Map.of("token", "$.access_token")),
                new MultiStepHttpProbe.Step("orders", "GET", "https://api.example.com/orders",
                        Map.of("Authorization", "Bearer ${login.token}"), null, Map.of())));

        ArgumentCaptor<HttpProbeRequest> requests = ArgumentCaptor.forClass(HttpProbeRequest.class);
        verify(http, times(2)).execute(requests.capture());
        assertThat(requests.getAllValues().get(1).headers()).containsEntry("Authorization", "Bearer t-123");
        assertThat(r.failedStep()).isNull();
        assertThat(r.responses()).hasSize(2);
        assertThat(r.totalMs()).isGreaterThanOrEqualTo(40);
    }

    @Test
    @DisplayName("stops at the first failing step")
    void stopsOnFailure() {
        when(http.execute(any())).thenThrow(new HttpProbeException("Timed out after 5000 ms", null));

        MultiStepHttpProbe.Result r = probe.execute(List.of(
                new MultiStepHttpProbe.Step("login", "POST", "https://api.example.com/token", Map.of(), "{}", Map.of()),
                new MultiStepHttpProbe.Step("orders", "GET", "https://api.example.com/orders", Map.of(), null, Map.of())));

        assertThat(r.failedStep()).isEqualTo("login");
        assertThat(r.error()).contains("Timed out");
        verify(http, times(1)).execute(any());
    }

    @Test
    @DisplayName("an unknown variable fails the step instead of sending the placeholder")
    void unknownVariable() {
        MultiStepHttpProbe.Result r = probe.execute(List.of(
                new MultiStepHttpProbe.Step("orders", "GET", "https://api.example.com/${login.id}", Map.of(), null,
                        Map.of())));
        assertThat(r.failedStep()).isEqualTo("orders");
        assertThat(r.error()).contains("login.id");
    }
}
