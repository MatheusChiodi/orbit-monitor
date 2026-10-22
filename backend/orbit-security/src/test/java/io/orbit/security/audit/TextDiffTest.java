package io.orbit.security.audit;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-46 SELECT change diff in the audit trail")
class TextDiffTest {

    @Test
    @DisplayName("shows removed and added lines")
    void diff() {
        String before = "SELECT COUNT(*)\nFROM v_pending\nWHERE status = 'P'";
        String after = "SELECT COUNT(*)\nFROM v_pending\nWHERE status IN ('P', 'R')";
        assertThat(TextDiff.of(before, after)).isEqualTo("-WHERE status = 'P'\n+WHERE status IN ('P', 'R')");
    }

    @Test
    @DisplayName("no diff for equal text; null counts as empty")
    void equal() {
        assertThat(TextDiff.of("SELECT 1", "SELECT 1")).isEmpty();
        assertThat(TextDiff.of(null, "SELECT 1")).isEqualTo("+SELECT 1");
    }
}
