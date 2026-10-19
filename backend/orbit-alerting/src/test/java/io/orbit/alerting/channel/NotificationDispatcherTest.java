package io.orbit.alerting.channel;

import io.orbit.alerting.InMemoryIncidentRepository;
import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentService;
import io.orbit.alerting.suppression.AlertDeduplicator;
import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;
import io.orbit.security.vault.MasterKey;
import io.orbit.security.vault.SecretCipher;
import io.orbit.security.vault.SecretResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.net.URI;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-28 incidents are delivered to the configured channels")
class NotificationDispatcherTest {

    // Public test card number (never a real card).
    private static final String TEST_PAN = "4111111111111111";
    private static final Instant T0 = Instant.parse("2026-10-18T12:00:00Z");

    record Post(URI uri, Map<String, String> headers, String body) {
    }

    @TempDir
    Path dir;
    private final List<Post> posts = new ArrayList<>();
    private final Set<String> suppressed = new java.util.HashSet<>();
    private final Clock clock = Clock.fixed(T0, ZoneOffset.UTC);
    private SecretResolver secrets;
    private List<ChannelDef> channels;
    private NotificationDispatcher dispatcher;
    private IncidentService incidents;

    @BeforeEach
    void setUp() {
        secrets = new SecretResolver(new SecretCipher(MasterKey.loadOrCreate(dir.resolve("master.key"))), n -> null);
        channels = new ArrayList<>(List.of(
                new ChannelDef("chn_slack", "Team Slack", ChannelDef.Type.SLACK,
                        secrets.seal("https://hooks.slack.example.com/T1/B1/xyz"), null, List.of(), "WARN", true),
                new ChannelDef("chn_hook", "Ticketing", ChannelDef.Type.WEBHOOK,
                        secrets.seal("https://tickets.example.com/hook"), secrets.seal("whsec"), List.of("grp_pay"),
                        "DOWN", true)));
        dispatcher = new NotificationDispatcher(() -> channels, (uri, headers, body) -> posts.add(new Post(uri, headers, body)),
                secrets, new AlertDeduplicator(Duration.ofMinutes(5)),
                suppressed::contains,
                id -> Optional.of(new NotificationDispatcher.MonitorInfo("Card queue", "grp_pay",
                        "CARD = " + TEST_PAN + " · rule ROWS == 0")),
                "http://orbit.local:8080", clock);
        incidents = new IncidentService(new InMemoryIncidentRepository(), id -> false, dispatcher::onIncident, clock,
                Duration.ofMinutes(5));
    }

    private void down(String monitor) {
        incidents.onStateChanged(new MonitorStateChanged(monitor, MonitorState.OK, MonitorState.DOWN, T0, T0));
    }

    @Test
    @DisplayName("an opened incident goes to every matching channel with masked text")
    void delivers() {
        down("sel_cards");

        assertThat(posts).hasSize(2);
        assertThat(posts).allSatisfy(p -> assertThat(p.body()).doesNotContain(TEST_PAN).contains("Card queue"));
        Post hook = posts.stream().filter(p -> p.uri().getHost().equals("tickets.example.com")).findFirst().orElseThrow();
        assertThat(hook.headers()).containsKeys("X-Orbit-Signature", "X-Orbit-Timestamp");
        assertThat(hook.body()).contains("http://orbit.local:8080/incidents/");
    }

    @Test
    @DisplayName("channels filter by group and minimum severity")
    void filters() {
        channels.set(1, new ChannelDef("chn_hook", "Ticketing", ChannelDef.Type.WEBHOOK,
                secrets.seal("https://tickets.example.com/hook"), null, List.of("grp_other"), "DOWN", true));
        down("sel_cards");
        assertThat(posts).extracting(p -> p.uri().getHost()).containsExactly("hooks.slack.example.com");
    }

    @Test
    @DisplayName("silenced or maintained monitors are not notified")
    void suppressed() {
        suppressed.add("sel_cards");
        down("sel_cards");
        assertThat(posts).isEmpty();
    }

    @Test
    @DisplayName("acknowledgements and comments do not notify; resolution does")
    void lifecycle() {
        down("sel_cards");
        Incident incident = incidents.openIncident("sel_cards").orElseThrow();
        posts.clear();
        incidents.acknowledge(incident.id(), "Ana");
        incidents.comment(incident.id(), "Ana", "on it");
        assertThat(posts).isEmpty();

        incidents.onStateChanged(new MonitorStateChanged("sel_cards", MonitorState.DOWN, MonitorState.OK, T0, T0));
        assertThat(posts).isNotEmpty().allSatisfy(p -> assertThat(p.body()).containsIgnoringCase("resolved"));
    }

    @Test
    @DisplayName("disabled channels are skipped")
    void disabled() {
        channels.replaceAll(c -> new ChannelDef(c.id(), c.name(), c.type(), c.url(), c.signingSecret(), c.groupIds(),
                c.minSeverity(), false));
        down("sel_cards");
        assertThat(posts).isEmpty();
    }

    @Test
    @DisplayName("channel definitions never print their URL or secret")
    void maskedToString() {
        ChannelDef c = channels.getFirst();
        assertThat(c.toString()).doesNotContain("hooks.slack").doesNotContain("v1:");
    }
}
