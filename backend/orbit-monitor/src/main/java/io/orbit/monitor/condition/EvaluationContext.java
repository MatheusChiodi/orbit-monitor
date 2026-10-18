package io.orbit.monitor.condition;

import java.util.Optional;

/** Fonte dos valores reais (resultado HTTP ou SQL) consultada durante a avaliação. */
public interface EvaluationContext {

    Optional<Object> resolve(Placeholder placeholder, String path);
}
