package io.orbit.api.web;

import io.orbit.workspace.status.StatusPageBuilder;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Optional;

/**
 * BE-59: the status page a browser opens ({@code /status/{slug}}), rendered on the server as plain HTML
 * so it works without the console bundle. Same visibility and caching as {@code GET /api/status/{slug}}:
 * internal pages answer 404 to view-only clients and are never indexed.
 */
@Controller
public class StatusPageHtmlController {

    private static final MediaType HTML = new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8);

    private final StatusPageController pages;
    private final Messages messages;

    public StatusPageHtmlController(StatusPageController pages, Messages messages) {
        this.pages = pages;
        this.messages = messages;
    }

    @GetMapping("/status/{slug:[a-z0-9][a-z0-9_-]{0,63}}")
    public ResponseEntity<String> page(@PathVariable String slug, HttpServletRequest request,
                                       HttpServletResponse response) {
        Locale locale = LocaleContextHolder.getLocale();
        Optional<StatusPageBuilder.View> view = pages.render(slug, request);
        if (view.isEmpty()) {
            response.setHeader("Cache-Control", "no-store");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).contentType(HTML)
                    .body(StatusPageHtml.notFound(locale, key -> messages.get(key, locale)));
        }
        pages.cacheHeaders(slug, response);
        response.setHeader("Content-Language", StatusPageHtml.lang(locale));
        return ResponseEntity.ok().contentType(HTML)
                .body(StatusPageHtml.page(view.get(), pages.isPublic(slug), locale, key -> messages.get(key, locale)));
    }
}
