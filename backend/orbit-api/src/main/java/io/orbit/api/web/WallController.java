package io.orbit.api.web;

import io.orbit.api.wall.WallViewFactory;
import io.orbit.api.wall.WallViews;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Wall snapshot over REST, for the first paint and for clients that missed WebSocket messages. */
@RestController
public class WallController {

    private final WallViewFactory views;

    public WallController(WallViewFactory views) {
        this.views = views;
    }

    @GetMapping("/api/wall/snapshot")
    public WallViews.WallSnapshot snapshot() {
        return views.snapshot();
    }
}
