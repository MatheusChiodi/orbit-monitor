package io.orbit.monitor.definition;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.orbit.config.ConfigItem;
import io.orbit.monitor.condition.Condition;

import java.time.Duration;
import java.util.List;

/** Settings shared by every monitor kind. */
public interface MonitorDef extends ConfigItem {

    String name();

    String groupId();

    int intervalSeconds();

    long timeoutMs();

    /** Consecutive failing checks needed to confirm DOWN. */
    int downAfter();

    /** Threshold tightening ratio while unhealthy (0.10 = 10%). */
    double hysteresis();

    /** Open an incident on WARN too, not only on DOWN. */
    boolean openOnWarn();

    boolean paused();

    List<ConditionDef> conditions();

    List<FieldDef> fields();

    @JsonIgnore
    MonitorKind kind();

    /** BE-17: execution window; null runs at any time. */
    default WindowDef window() {
        return null;
    }

    /** BE-18: retry policy; null means one attempt. */
    default RetryDef retry() {
        return null;
    }

    @JsonIgnore
    default List<Condition> parsedConditions() {
        return conditions().stream().map(ConditionDef::parse).toList();
    }

    @JsonIgnore
    default Duration interval() {
        return Duration.ofSeconds(intervalSeconds());
    }
}
