package io.orbit.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import java.util.List;
import java.util.Locale;

/** Request language from {@code Accept-Language}: English (default) or Brazilian Portuguese. */
@Configuration
public class I18nConfig {

    public static final Locale PT_BR = Locale.forLanguageTag("pt-BR");

    @Bean
    LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
        resolver.setSupportedLocales(List.of(Locale.ENGLISH, PT_BR));
        resolver.setDefaultLocale(Locale.ENGLISH);
        return resolver;
    }
}
