package io.orbit.api.web;

import io.orbit.security.access.AccessAction;
import io.orbit.security.settings.SettingsService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.UnknownHostException;

/** Whether the calling client may edit (the access policy; there is no login). */
@Component
public class Editors {

    private final SettingsService settings;

    public Editors(SettingsService settings) {
        this.settings = settings;
    }

    public boolean isEditor(HttpServletRequest request) {
        try {
            return settings.policy().decide(InetAddress.getByName(request.getRemoteAddr()), AccessAction.MUTATE);
        } catch (UnknownHostException e) {
            return false;
        }
    }
}
