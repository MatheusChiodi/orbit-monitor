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

import java.io.IOException;
import java.net.InetAddress;
import java.util.Set;

/**
 * Applies the network access policy (there is no login): reads are open, incident acknowledgement
 * follows {@code lanAcknowledge}, every other change must come from an allowed address. The client
 * address is the TCP peer; forwarding headers are never trusted. Also sets the security headers.
 */
public class AccessFilter extends OncePerRequestFilter {

    private static final Set<String> READ_METHODS = Set.of("GET", "HEAD", "OPTIONS");

    private final AccessPolicy policy;
    private final ObjectMapper json;

    public AccessFilter(AccessPolicy policy, ObjectMapper json) {
        this.policy = policy;
        this.json = json;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        securityHeaders(request, response);
        AccessAction action = actionOf(request);
        InetAddress remote = InetAddress.getByName(request.getRemoteAddr());
        if (!policy.decide(remote, action)) {
            deny(response);
            return;
        }
        chain.doFilter(request, response);
    }

    static AccessAction actionOf(HttpServletRequest request) {
        if (READ_METHODS.contains(request.getMethod())) {
            return AccessAction.READ;
        }
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if (request.getMethod().equals("POST") && path.startsWith("/api/incidents/")) {
            return AccessAction.ACKNOWLEDGE;
        }
        return AccessAction.MUTATE;
    }

    private void deny(HttpServletResponse response) throws IOException {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN,
                "Changes are only allowed from an address permitted by the access policy (" + policy.mode() + ")");
        problem.setTitle("Forbidden");
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
