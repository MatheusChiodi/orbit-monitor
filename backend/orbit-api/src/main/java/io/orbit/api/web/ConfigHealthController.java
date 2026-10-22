package io.orbit.api.web;

import io.orbit.config.ConfigHealth;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** CORE-19: state of every orbit.&lt;feature&gt;.json for the Settings screen (no values, masked errors). */
@RestController
public class ConfigHealthController {

    private final ConfigHealth health;

    public ConfigHealthController(ConfigHealth health) {
        this.health = health;
    }

    @GetMapping("/api/config/health")
    public List<ConfigHealth.FileHealth> health() {
        return health.report();
    }
}
