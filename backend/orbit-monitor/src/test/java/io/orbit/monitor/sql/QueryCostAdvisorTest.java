package io.orbit.monitor.sql;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-14 query cost warning")
class QueryCostAdvisorTest {

    @Test
    @DisplayName("fast queries need no advice")
    void fast() {
        assertThat(QueryCostAdvisor.advise(Duration.ofMillis(300), 60).level()).isEqualTo(QueryCostAdvisor.Level.NONE);
    }

    @Test
    @DisplayName("slow queries suggest an interval of at least 60x the preview time")
    void slow() {
        QueryCostAdvisor.Advice advice = QueryCostAdvisor.advise(Duration.ofSeconds(3), 30);
        assertThat(advice.level()).isEqualTo(QueryCostAdvisor.Level.WARN);
        assertThat(advice.suggestedIntervalSeconds()).isEqualTo(180);
        assertThat(advice.messageKey()).isEqualTo("sql.cost.warn");
    }

    @Test
    @DisplayName("a long enough interval keeps the current one")
    void keepsLongInterval() {
        assertThat(QueryCostAdvisor.advise(Duration.ofSeconds(3), 600).suggestedIntervalSeconds()).isEqualTo(600);
    }

    @Test
    @DisplayName("heavy queries suggest 15 minutes and a view")
    void heavy() {
        QueryCostAdvisor.Advice advice = QueryCostAdvisor.advise(Duration.ofSeconds(12), 60);
        assertThat(advice.level()).isEqualTo(QueryCostAdvisor.Level.HEAVY);
        assertThat(advice.suggestedIntervalSeconds()).isGreaterThanOrEqualTo(900);
        assertThat(advice.messageKey()).isEqualTo("sql.cost.heavy");
    }
}
