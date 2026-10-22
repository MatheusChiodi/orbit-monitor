package io.orbit.api.web;

import io.orbit.security.audit.AuditLog;
import io.orbit.workspace.customization.TerminologyService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** BE-51 / FE-54: custom labels per locale ({@code orbit.terminology.json}). */
@RestController
@RequestMapping("/api/terminology")
public class TerminologyController {

    public record TermsRequest(Map<String, String> terms) {
    }

    public record TermsView(String locale, Map<String, String> terms) {
    }

    private final TerminologyService terminology;
    private final AuditLog audit;

    public TerminologyController(TerminologyService terminology, AuditLog audit) {
        this.terminology = terminology;
        this.audit = audit;
    }

    @GetMapping
    public ConfigPayload<TerminologyService.Terms> list() {
        return ConfigPayload.of(terminology.list());
    }

    /** The custom labels of a locale; an empty map when none are set. */
    @GetMapping("/{locale}")
    public TermsView get(@PathVariable String locale) {
        requireLocale(locale);
        return new TermsView(locale, terminology.terms(locale));
    }

    @PutMapping("/{locale}")
    public TerminologyService.Terms save(@PathVariable String locale, @RequestBody TermsRequest body,
                                         @RequestHeader(value = Operators.HEADER, required = false) String header,
                                         HttpServletRequest request) {
        String operator = Operators.require(header, null);
        TerminologyService.Terms saved = terminology.save(locale, body.terms(), operator);
        audit.record(operator, "terminology.save", locale, saved.terms().size() + " terms", request.getRemoteAddr());
        return saved;
    }

    @DeleteMapping("/{locale}")
    public ResponseEntity<Void> reset(@PathVariable String locale,
                                      @RequestHeader(value = Operators.HEADER, required = false) String header,
                                      HttpServletRequest request) {
        String operator = Operators.require(header, null);
        requireLocale(locale);
        if (!terminology.delete(locale)) {
            throw new NotFoundException("Terminology", locale);
        }
        audit.record(operator, "terminology.reset", locale, null, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    private static void requireLocale(String locale) {
        if (!TerminologyService.LOCALES.contains(locale)) {
            throw new IllegalArgumentException("locale must be en or pt-BR");
        }
    }
}
