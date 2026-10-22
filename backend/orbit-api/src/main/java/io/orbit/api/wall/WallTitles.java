package io.orbit.api.wall;

import org.springframework.context.MessageSource;

import java.text.MessageFormat;
import java.util.Locale;
import java.util.function.Supplier;

/**
 * CORE-15: texts of the wall timeline. The wall is shared (a TV), so titles use the workspace
 * language from orbit.settings.json, not the language of one viewer.
 */
@FunctionalInterface
public interface WallTitles {

    /** @param fallback English pattern used when the key is missing */
    String text(String key, String fallback, Object... args);

    static WallTitles english() {
        return (key, fallback, args) -> new MessageFormat(fallback, Locale.ENGLISH).format(args);
    }

    static WallTitles of(MessageSource source, Supplier<Locale> locale) {
        return (key, fallback, args) -> source.getMessage(key, args,
                new MessageFormat(fallback, Locale.ENGLISH).format(args), locale.get());
    }
}
