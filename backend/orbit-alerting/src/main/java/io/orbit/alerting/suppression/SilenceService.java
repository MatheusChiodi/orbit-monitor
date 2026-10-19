package io.orbit.alerting.suppression;

import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigItem;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

/** BE-32: silence/snooze a monitor or group with a reason, the operator name and an expiry (orbit.silences.json). */
public class SilenceService {

    public record Silence(String id, String target, String reason, String createdBy, Instant createdAt,
                          Instant until) implements ConfigItem {
    }

    public SilenceService(ConfigFile<Silence> file, Clock clock) {
    }

    public Silence silence(String target, String reason, String operator, Instant until) {
        throw new UnsupportedOperationException("BE-32 silence/snooze is not implemented yet");
    }

    public boolean isSilenced(String target) {
        throw new UnsupportedOperationException("BE-32 silence/snooze is not implemented yet");
    }

    /** Active silences; expired ones are removed from the file. */
    public List<Silence> active() {
        throw new UnsupportedOperationException("BE-32 silence/snooze is not implemented yet");
    }

    public boolean lift(String id, String operator) {
        throw new UnsupportedOperationException("BE-32 silence/snooze is not implemented yet");
    }
}
