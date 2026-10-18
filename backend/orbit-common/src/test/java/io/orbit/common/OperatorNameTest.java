package io.orbit.common;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OperatorNameTest {

    @Test
    void trimsAndCollapsesWhitespace() {
        assertThat(OperatorName.normalize("  M.   Chiodi ")).isEqualTo("M. Chiodi");
    }

    @Test
    void dropsControlCharacters() {
        assertThat(OperatorName.normalize("Ana\n\tSilva\u0000")).isEqualTo("Ana Silva");
    }

    @Test
    void capsTheLength() {
        assertThat(OperatorName.normalize("x".repeat(100))).hasSize(OperatorName.MAX_LENGTH);
    }

    @Test
    void rejectsBlankOrNull() {
        assertThatThrownBy(() -> OperatorName.normalize("  ")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> OperatorName.normalize(null)).isInstanceOf(IllegalArgumentException.class);
    }
}
