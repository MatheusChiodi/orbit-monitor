package io.orbit.api.web;

import io.orbit.security.audit.AuditLog;
import io.orbit.workspace.layout.WallLayoutService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Wall layouts (orbit.layouts.json) addressed by slug; any client may read, only editors may change. */
@RestController
@RequestMapping("/api/layouts")
public class LayoutController {

    public record LayoutRequest(String slug, String name, List<WallLayoutService.Block> blocks, String themeId,
                                String animationLevel, WallLayoutService.Playlist playlist) {
    }

    private final WallLayoutService layouts;
    private final AuditLog audit;

    public LayoutController(WallLayoutService layouts, AuditLog audit) {
        this.layouts = layouts;
        this.audit = audit;
    }

    @GetMapping
    public List<WallLayoutService.Layout> list() {
        return layouts.list();
    }

    @GetMapping("/{slug}")
    public WallLayoutService.Layout bySlug(@PathVariable String slug) {
        return layouts.resolve(slug).orElseThrow(() -> new NotFoundException("Layout", slug));
    }

    @PutMapping("/{id}")
    public WallLayoutService.Layout save(@PathVariable String id, @RequestBody LayoutRequest body,
                                         HttpServletRequest request) {
        String operator = Actors.current();
        WallLayoutService.Layout saved = layouts.save(new WallLayoutService.Layout(id, body.slug(), body.name(), 0,
                body.blocks(), null, null, body.themeId(), body.animationLevel(), body.playlist()), operator);
        audit.record(operator, "layout.save", id, body.slug() + " v" + saved.version(), request.getRemoteAddr());
        return saved;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
                                       HttpServletRequest request) {
        String operator = Actors.current();
        if (!layouts.delete(id)) {
            throw new NotFoundException("Layout", id);
        }
        audit.record(operator, "layout.delete", id, null, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}
