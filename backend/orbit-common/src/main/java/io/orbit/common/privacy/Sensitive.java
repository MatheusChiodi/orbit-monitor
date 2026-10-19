package io.orbit.common.privacy;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a field or record component whose value must always go through the redactor when it is
 * serialized (CORE-16 defense in depth, on top of the probe-boundary redaction).
 */
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.FIELD, ElementType.RECORD_COMPONENT, ElementType.METHOD})
public @interface Sensitive {
}
