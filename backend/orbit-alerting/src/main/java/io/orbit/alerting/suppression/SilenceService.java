package io.orbit.alerting.suppression;

import io.orbit.common.OperatorName;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigItem;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** BE-32: silence/snooze a monitor or group with a reason, the operator name and an expiry (orbit.silences.json). */
public class SilenceService {

    public record Silence(String id, String target, String reason, String createdBy, Instant createdAt,
                          Instant until) implements ConfigItem {
    }

    private final ConfigFile<Silence> file;
    private final Clock clock;

    public SilenceService(ConfigFile<Silence> file, Clock clock) {
        this.file = file;
        this.clock = clock;
    }

    public synchronized Silence silence(String target, String reason, String operator, Instant until) {
        if (target == null || target.isBlank()) {
            throw new IllegalArgumentException("A target is required");
        }
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("A reason is required");
        }
        Instant now = clock.instant();
        if (until == null || !until.isAfter(now)) {
            throw new IllegalArgumentException("The silence must end in the future");
        }
        Silence silence = new Silence("sil_" + UUID.randomUUID().toString().substring(0, 8), target, reason.strip(),
                OperatorName.normalize(operator), now, until);
        List<Silence> items = new ArrayList<>(active());
        items.add(silence);
        file.save(items);
        return silence;
    }

    public boolean isSilenced(String target) {
        Instant now = clock.instant();
        return file.items().stream().anyMatch(s -> s.target().equals(target) && s.until().isAfter(now));
    }

    /** Active silences; expired ones are removed from the file. */
    public synchronized List<Silence> active() {
        Instant now = clock.instant();
        List<Silence> active = file.items().stream().filter(s -> s.until().isAfter(now)).toList();
        if (active.size() != file.items().size()) {
            file.save(active);
        }
        return active;
    }

    public synchronized boolean lift(String id, String operator) {
        OperatorName.normalize(operator);
        List<Silence> remaining = file.items().stream().filter(s -> !s.id().equals(id)).toList();
        if (remaining.size() == file.items().size()) {
            return false;
        }
        file.save(remaining);
        return true;
    }
}
