package io.orbit.api.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.security.access.AccessAction;
import io.orbit.security.access.AccessPolicy;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.LocaleResolver;

import java.io.IOException;
import java.net.InetAddress;
import java.util.Locale;
import java.util.function.Supplier;
import java.util.Set;

/**
 * Applies the network access policy (there is no login): reads are open, incident acknowledgement
 * follows {@code lanAcknowledge}, every other change must come from an allowed address. The client
 * address is the TCP peer; forwarding headers are never trusted. Also sets the security headers.
 */
public class AccessFilter extends OncePerRequestFilter {

    private static final Set<String> READ_METHODS = Set.of("GET", "HEAD", "OPTIONS");

    private final Supplier<AccessPolicy> policy;
    private final ObjectMapper json;
    private final Messages messages;
    private final LocaleResolver locales;

    public AccessFilter(Supplier<AccessPolicy> policy, ObjectMapper json, Messages messages, LocaleResolver locales) {
        this.policy = policy;
        this.json = json;
        this.messages = messages;
        this.locales = locales;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        securityHeaders(request, response);
        AccessAction action = actionOf(request);
        InetAddress remote = InetAddress.getByName(request.getRemoteAddr());
        if (!policy.get().decide(remote, action)) {
            deny(response, locales.resolveLocale(request));
            return;
        }
        chain.doFilter(request, response);
    }

    static AccessAction actionOf(HttpServletRequest request) {
        if (READ_METHODS.contains(request.getMethod())) {
            return AccessAction.READ;
        }
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if (path.startsWith("/api/push/")) {
            // BE-03: the secret push token authenticates the call; a job on another machine sends it.
            return AccessAction.READ;
        }
        // Only the acknowledgement is open to view-only clients; resolve, reopen, comments and tickets are changes.
        if (request.getMethod().equals("POST") && path.startsWith("/api/incidents/") && path.endsWith("/ack")) {
            return AccessAction.ACKNOWLEDGE;
        }
        return AccessAction.MUTATE;
    }

    private void deny(HttpServletResponse response, Locale locale) throws IOException {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN,
                messages.get("problem.access-denied.detail", locale, policy.get().mode()));
        problem.setTitle(messages.get("problem.access-denied.title", locale));
        problem.setProperty("code", "access-denied");
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        json.writeValue(response.getOutputStream(), problem);
    }

    private static void securityHeaders(HttpServletRequest request, HttpServletResponse response) {
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Content-Security-Policy", "default-src 'self'; connect-src 'self' ws: wss:; "
                + "img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'");
        if (request.getRequestURI().startsWith("/api/")) {
            response.setHeader("Cache-Control", "no-store");
        }
    }
}
