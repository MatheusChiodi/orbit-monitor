package io.orbit.security.settings;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("FE-10 backend: workspace logo SVG sanitizer (allowlist)")
class SvgSanitizerTest {

    @Test
    @DisplayName("keeps shapes, gradients and presentation attributes")
    void keepsDrawing() {
        String clean = SvgSanitizer.sanitize("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\">"
                + "<defs><linearGradient id=\"g\"><stop offset=\"0\" stop-color=\"#fff\"/></linearGradient></defs>"
                + "<circle cx=\"12\" cy=\"12\" r=\"10\" fill=\"url(#g)\"/><title>Orbit</title></svg>");
        assertThat(clean).contains("<circle", "cx=\"12\"", "fill=\"url(#g)\"", "linearGradient", "viewBox=\"0 0 24 24\"",
                "<title>Orbit</title>");
    }

    @Test
    @DisplayName("removes scripts, event handlers, foreignObject, style blocks and external or javascript links")
    void removesActiveContent() {
        String clean = SvgSanitizer.sanitize("<svg xmlns=\"http://www.w3.org/2000/svg\" "
                + "xmlns:xlink=\"http://www.w3.org/1999/xlink\" onload=\"alert(1)\">"
                + "<script>alert(1)</script><style>*{background:url(https://evil.example)}</style>"
                + "<foreignObject><div>x</div></foreignObject>"
                + "<a href=\"javascript:alert(1)\"><rect width=\"1\" height=\"1\" onclick=\"x()\"/></a>"
                + "<use xlink:href=\"https://evil.example/s.svg#a\"/><use href=\"#local\"/>"
                + "<image href=\"https://tracker.example/p.png\"/>"
                + "<rect fill=\"url(https://evil.example/x)\" style=\"fill:red\"/></svg>");
        assertThat(clean).doesNotContain("script", "onload", "onclick", "foreignObject", "<style", "javascript",
                "evil.example", "tracker.example", "<image", "<a", "style=");
        assertThat(clean).contains("href=\"#local\"", "<rect");
    }

    @Test
    @DisplayName("rejects DOCTYPE/entities (XXE, billion laughs), non-SVG roots and oversized logos")
    void rejects() {
        assertThatThrownBy(() -> SvgSanitizer.sanitize("<!DOCTYPE svg [<!ENTITY x SYSTEM \"file:///etc/passwd\">]>"
                + "<svg xmlns=\"http://www.w3.org/2000/svg\">&x;</svg>")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SvgSanitizer.sanitize("<html/>")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SvgSanitizer.sanitize("not xml")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SvgSanitizer.sanitize("<svg xmlns=\"http://www.w3.org/2000/svg\">"
                + "<rect/>".repeat(20_000) + "</svg>")).isInstanceOf(IllegalArgumentException.class);
    }
}
