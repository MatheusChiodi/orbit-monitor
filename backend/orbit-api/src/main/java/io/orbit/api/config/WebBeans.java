package io.orbit.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.api.privacy.SensitiveDataModule;
import io.orbit.api.runtime.ConnectionPools;
import io.orbit.api.web.AccessFilter;
import io.orbit.api.web.Messages;
import io.orbit.api.web.MonitorRequestMapper;
import io.orbit.api.web.PreviewService;
import io.orbit.api.web.RateLimitFilter;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.monitor.privacy.PayloadRedactor;
import io.orbit.probe.http.HttpProbe;
import io.orbit.probe.sql.SqlProbe;
import io.orbit.security.access.RateLimiter;
import io.orbit.security.vault.SecretResolver;
import io.orbit.security.settings.SettingsService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.servlet.LocaleResolver;

import java.time.Clock;

/** HTTP edge: access policy and security headers run before everything else, then rate limiting. */
@Configuration
public class WebBeans {

    @Bean
    FilterRegistrationBean<AccessFilter> accessFilter(SettingsService settings, ObjectMapper json, Messages messages,
                                                      LocaleResolver localeResolver) {
        FilterRegistrationBean<AccessFilter> registration =
                new FilterRegistrationBean<>(new AccessFilter(settings::policy, json, messages, localeResolver));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        registration.addUrlPatterns("/*");
        return registration;
    }

    /** BE-47: per client IP token bucket on /api/** (including the push endpoint). */
    @Bean
    FilterRegistrationBean<RateLimitFilter> rateLimitFilter(
            Clock clock, ObjectMapper json, Messages messages, LocaleResolver localeResolver,
            @Value("${orbit.rate-limit.requests-per-minute:300}") int requestsPerMinute,
            @Value("${orbit.rate-limit.burst:60}") int burst,
            @Value("${orbit.rate-limit.exempt-loopback:true}") boolean exemptLoopback) {
        FilterRegistrationBean<RateLimitFilter> registration = new FilterRegistrationBean<>(new RateLimitFilter(
                new RateLimiter(clock, requestsPerMinute, burst), exemptLoopback, json, messages, localeResolver));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 1);
        registration.addUrlPatterns("/api/*");
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
                                  HttpProbe httpProbe, PayloadRedactor redactor, Messages messages) {
        return new PreviewService(definitions, pools, sqlProbe, httpProbe, redactor, messages);
    }
}
