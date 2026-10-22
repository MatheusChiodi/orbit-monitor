package io.orbit.api.config;

import io.orbit.config.ConfigMapper;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.monitor.definition.QueryCatalog;
import io.orbit.probe.sql.CatalogIntrospector;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.Duration;

/** SQL editor support: saved queries (BE-12, orbit.query-catalog.json) and table/column introspection (BE-13). */
@Configuration
public class SqlEditorBeans {

    @Bean
    QueryCatalog queryCatalog(OrbitProperties properties, MonitorDefinitions definitions) {
        return QueryCatalog.open(properties.configDir(), ConfigMapper.create(), definitions);
    }

    @Bean
    CatalogIntrospector catalogIntrospector(Clock clock) {
        return new CatalogIntrospector(clock, Duration.ofMinutes(10), 2_000);
    }
}
