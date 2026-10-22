package io.orbit.api.web;

import io.orbit.alerting.template.NotificationTemplate;
import io.orbit.alerting.template.TemplateCatalog;
import io.orbit.config.ConfigFile;
import io.orbit.security.audit.AuditLog;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * BE-35: notification templates. Built-in en/pt-BR texts can be overridden per id and language in
 * orbit.notification-templates.json; deleting an override restores the default. Previews are redacted
 * like real notifications.
 */
@RestController
@RequestMapping("/api/notification-templates")
public class NotificationTemplateController {

    /** Languages left out keep the built-in text. */
    public record TemplateRequest(Map<String, String> title, Map<String, String> text) {
    }

    public record TemplateView(String id, Map<String, String> title, Map<String, String> text, boolean custom) {
    }

    public record TemplateList(List<TemplateView> templates, List<String> variables) {
    }

    /** Missing variables are filled with sample values. */
    public record PreviewRequest(String locale, Map<String, Object> variables) {
    }

    private static final Map<String, Object> SAMPLE = Map.of("monitor", "Fila de pagamentos", "group", "grp_payments",
            "severity", "DOWN", "detail", "PENDING_QTY 347 > 200", "link", "http://127.0.0.1:8080/incidents/inc_sample",
            "incidentId", "inc_sample", "openedAt", "2026-10-18T17:04:00Z", "duration", "12 min", "ticket", "INC-4821",
            "step", "Manager");

    private final ConfigFile<NotificationTemplate> file;
    private final TemplateCatalog catalog;
    private final AuditLog audit;

    public NotificationTemplateController(ConfigFile<NotificationTemplate> file, TemplateCatalog catalog,
                                          AuditLog audit) {
        this.file = file;
        this.catalog = catalog;
        this.audit = audit;
    }

    @GetMapping
    public TemplateList list() {
        return new TemplateList(catalog.effective().stream().map(this::view).toList(), TemplateCatalog.VARIABLES);
    }

    @PutMapping("/{id}")
    public synchronized TemplateView save(@PathVariable String id, @RequestBody TemplateRequest body,
                                          @RequestHeader(value = Operators.HEADER, required = false) String header,
                                          HttpServletRequest request) {
        String operator = Operators.require(header, null);
        NotificationTemplate template = new NotificationTemplate(id, body.title(), body.text());
        List<NotificationTemplate> items = new ArrayList<>(file.items().stream().filter(t -> !t.id().equals(id)).toList());
        items.add(template);
        file.save(items);
        audit.record(operator, "notification-template.save", id, null, request.getRemoteAddr());
        return view(catalog.effective(id));
    }

    @PostMapping("/{id}/preview")
    public TemplateCatalog.Rendered preview(@PathVariable String id, @RequestBody(required = false) PreviewRequest body) {
        Map<String, Object> variables = new HashMap<>(SAMPLE);
        variables.put("onCall", "Ana");
        if (body != null && body.variables() != null) {
            variables.putAll(body.variables());
        }
        String locale = body == null || body.locale() == null ? "en" : body.locale();
        return catalog.render(id, Locale.forLanguageTag(locale), variables);
    }

    @DeleteMapping("/{id}")
    public synchronized ResponseEntity<Void> reset(@PathVariable String id,
                                                   @RequestHeader(value = Operators.HEADER, required = false)
                                                   String header, HttpServletRequest request) {
        String operator = Operators.require(header, null);
        List<NotificationTemplate> remaining = file.items().stream().filter(t -> !t.id().equals(id)).toList();
        if (remaining.size() == file.items().size()) {
            throw new NotFoundException("Notification template override", id);
        }
        file.save(remaining);
        audit.record(operator, "notification-template.reset", id, null, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    private TemplateView view(NotificationTemplate t) {
        return new TemplateView(t.id(), t.title(), t.text(), catalog.isCustom(t.id()));
    }
}
