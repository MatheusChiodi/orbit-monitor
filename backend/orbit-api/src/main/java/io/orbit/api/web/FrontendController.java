package io.orbit.api.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * CORE-20: the built frontend ships inside the jar under {@code static/} (console {@code index.html},
 * welcome page at {@code /}; wall {@code wall.html}). Wall layout paths ({@code /wall/noc}) are client
 * routes, so they are forwarded to {@code wall.html}.
 */
@Controller
public class FrontendController {

    @GetMapping("/wall")
    public String wall() {
        return "forward:/wall.html";
    }

    @GetMapping("/wall/{slug:[a-z0-9][a-z0-9_-]{0,63}}")
    public String wallLayout(@PathVariable String slug) {
        return "forward:/wall.html";
    }
}
