package io.orbit.api.web;

import io.orbit.common.i18n.Localizable;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;

import java.util.Locale;

/** Resolves user-facing texts from messages*.properties; unknown keys fall back to the given English text. */
@Component
public class Messages {

    private final MessageSource source;

    public Messages(MessageSource source) {
        this.source = source;
    }

    public String get(String key, Locale locale, Object... args) {
        return source.getMessage(key, args, key, locale);
    }

    public String getOr(String key, String fallback, Locale locale, Object... args) {
        return source.getMessage(key, args, fallback, locale);
    }

    /** Text of a translatable domain error in the current request language. */
    public String of(Localizable error, String fallback) {
        return getOr(error.messageKey(), fallback, LocaleContextHolder.getLocale(), error.messageArgs());
    }

    public String current(String key, Object... args) {
        return get(key, LocaleContextHolder.getLocale(), args);
    }
}
