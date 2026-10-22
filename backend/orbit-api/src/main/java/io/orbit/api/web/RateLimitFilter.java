package io.orbit.api.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.security.access.RateLimiter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.LocaleResolver;

import java.io.IOException;
import java.net.InetAddress;

/**
 * BE-47: per client IP token bucket on the API and the push endpoint. The client is the TCP peer
 * (forwarding headers are never trusted). Over the limit: 429 Problem Details with Retry-After.
 * The operator's own machine (loopback) is exempt by default: the console polls it constantly and
 * the limit exists to protect against floods from the network.
 */
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimiter limiter;
    private final boolean exemptLoopback;
    private final ObjectMapper json;
    private final Messages messages;
    private final LocaleResolver locales;

    public RateLimitFilter(RateLimiter limiter, boolean exemptLoopback, ObjectMapper json, Messages messages,
                           LocaleResolver locales) {
        this.limiter = limiter;
        this.exemptLoopback = exemptLoopback;
        this.json = json;
        this.messages = messages;
        this.locales = locales;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return !path.startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String client = request.getRemoteAddr();
        if (exemptLoopback && InetAddress.getByName(client).isLoopbackAddress()) {
            chain.doFilter(request, response);
            return;
        }
        RateLimiter.Decision decision = limiter.tryAcquire(client);
        if (decision.allowed()) {
            chain.doFilter(request, response);
            return;
        }
        long seconds = Math.max(1, (decision.retryAfter().toMillis() + 999) / 1000);
        var locale = locales.resolveLocale(request);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS,
                messages.get("problem.rate-limited.detail", locale, seconds));
        problem.setTitle(messages.get("problem.rate-limited.title", locale));
        problem.setProperty("code", "rate-limited");
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader(HttpHeaders.RETRY_AFTER, Long.toString(seconds));
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        json.writeValue(response.getOutputStream(), problem);
    }
}
