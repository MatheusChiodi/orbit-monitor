package io.orbit.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.api.web.AccessFilter;
import io.orbit.security.access.AccessPolicy;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

/** HTTP edge: access policy and security headers run before everything else. */
@Configuration
public class WebBeans {

    @Bean
    FilterRegistrationBean<AccessFilter> accessFilter(AccessPolicy policy, ObjectMapper json) {
        FilterRegistrationBean<AccessFilter> registration = new FilterRegistrationBean<>(new AccessFilter(policy, json));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        registration.addUrlPatterns("/*");
        return registration;
    }
}
