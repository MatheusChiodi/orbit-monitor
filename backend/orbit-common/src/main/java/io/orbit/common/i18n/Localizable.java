package io.orbit.common.i18n;

/**
 * An error whose user-facing text can be translated: the API resolves {@link #messageKey()} with
 * {@link #messageArgs()} in the request language and falls back to the English exception message.
 */
public interface Localizable {

    String messageKey();

    Object[] messageArgs();
}
