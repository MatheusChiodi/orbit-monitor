package io.orbit.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.api.privacy.SensitiveDataModule;
import io.orbit.api.runtime.ConnectionPools;
import io.orbit.api.web.AccessFilter;
import io.orbit.api.web.Messages;
import io.orbit.api.web.MonitorRequestMapper;
import io.orbit.api.web.PreviewService;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.monitor.privacy.PayloadRedactor;
import io.orbit.probe.http.HttpProbe;
import io.orbit.probe.sql.SqlProbe;
import io.orbit.security.vault.SecretResolver;
import io.orbit.security.access.AccessPolicy;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.servlet.LocaleResolver;

/** HTTP edge: access policy and security headers run before everything else. */
@Configuration
public class WebBeans {

    @Bean
    FilterRegistrationBean<AccessFilter> accessFilter(AccessPolicy policy, ObjectMapper json, Messages messages,
                                                      LocaleResolver localeResolver) {
        FilterRegistrationBean<AccessFilter> registration =
                new FilterRegistrationBean<>(new AccessFilter(policy, json, messages, localeResolver));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        registration.addUrlPatterns("/*");
        return registration;
    }

    /** Registered in Spring's ObjectMapper: every response and WebSocket message is masked again. */
    @Bean
    SensitiveDataModule sensitiveDataModule(SensitiveDataRedactor redactor) {
        return new SensitiveDataModule(redactor);
    }

    @Bean
    MonitorRequestMapper monitorRequestMapper(SecretResolver secrets, SensitiveDataRedactor redactor,
                                              MonitorDefinitions definitions) {
        return new MonitorRequestMapper(secrets, redactor, definitions);
    }

    @Bean
    PreviewService previewService(MonitorDefinitions definitions, ConnectionPools pools, SqlProbe sqlProbe,
                                  HttpProbe httpProbe, PayloadRedactor redactor) {
        return new PreviewService(definitions, pools, sqlProbe, httpProbe, redactor);
    }
}
