package io.orbit.api.web;

import io.orbit.security.access.AccessAction;
import io.orbit.security.access.AccessPolicy;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.InetAddress;
import java.net.UnknownHostException;

/** Lets the console know whether this client may edit or only view (there is no login). */
@RestController
public class AccessController {

    /**
     * @param mode   {@code edit} or {@code view-only}
     * @param client {@code loopback}, {@code lan} or {@code unknown}
     */
    public record AccessView(String mode, String client) {
    }

    private final AccessPolicy policy;

    public AccessController(AccessPolicy policy) {
        this.policy = policy;
    }

    @GetMapping("/api/access")
    public AccessView access(HttpServletRequest request) throws UnknownHostException {
        InetAddress remote = InetAddress.getByName(request.getRemoteAddr());
        return new AccessView(policy.decide(remote, AccessAction.MUTATE) ? "edit" : "view-only",
                AccessPolicy.clientKind(remote));
    }
}
