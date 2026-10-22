package io.orbit.api.web;

import io.orbit.security.access.AccessPolicy;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.net.InetAddress;
import java.net.UnknownHostException;

/**
 * Who made a change. Orbit has no login and no operator names, so the actor recorded on audit
 * entries, acknowledgements, comments and {@code updatedBy} is where the request came from:
 * {@code loopback} (the machine running Orbit), {@code lan} or {@code unknown}.
 */
public final class Actors {

    public static final String UNKNOWN = "unknown";

    private Actors() {
    }

    /** The actor of the request being handled; {@code unknown} outside a request. */
    public static String current() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            return of(attributes.getRequest());
        }
        return UNKNOWN;
    }

    public static String of(HttpServletRequest request) {
        try {
            // The remote address is an IP literal, so no name lookup happens here.
            return AccessPolicy.clientKind(InetAddress.getByName(request.getRemoteAddr()));
        } catch (UnknownHostException e) {
            return UNKNOWN;
        }
    }
}
