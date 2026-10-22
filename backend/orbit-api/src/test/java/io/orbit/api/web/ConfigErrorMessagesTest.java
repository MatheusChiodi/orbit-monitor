package io.orbit.api.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.ResourceBundleMessageSource;

import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CORE-15: configuration validation errors in en and pt-BR")
class ConfigErrorMessagesTest {

    private final ConfigErrorMessages messages = new ConfigErrorMessages(source());
    private static final Locale PT = Locale.forLanguageTag("pt-BR");

    private static ResourceBundleMessageSource source() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasename("messages");
        source.setDefaultEncoding("UTF-8");
        source.setFallbackToSystemLocale(false);
        return source;
    }

    @Test
    @DisplayName("known errors are translated, keeping the item id and the values")
    void translates() {
        assertThat(messages.localize("tcp_db: port must be between 1 and 65535", PT))
                .isEqualTo("tcp_db: a porta deve estar entre 1 e 65535");
        assertThat(messages.localize("sel_q: name is required", PT)).isEqualTo("sel_q: name é obrigatório");
        assertThat(messages.localize("req_api: step login: url must be http(s)://host/...", PT))
                .isEqualTo("req_api: step login: a URL deve ser http(s)://host/...");
        assertThat(messages.localize("tcp_w: window: unknown time zone Mars/Base", PT))
                .isEqualTo("tcp_w: janela: fuso horário desconhecido Mars/Base");
        assertThat(messages.localize("sel_p: parameters need a value for status, day", PT))
                .isEqualTo("sel_p: os parâmetros precisam de valor para status, day");
    }

    @Test
    @DisplayName("English stays as written and unknown errors fall back to the original text")
    void fallback() {
        assertThat(messages.localize("tcp_db: port must be between 1 and 65535", Locale.ENGLISH))
                .isEqualTo("tcp_db: port must be between 1 and 65535");
        assertThat(messages.localize("x: something new", PT)).isEqualTo("x: something new");
    }
}
