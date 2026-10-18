package io.orbit.workspace;

import io.orbit.config.ConfigItem;

import java.time.Instant;
import java.util.List;

/**
 * A system or team (Payments, Customer Portal, Core Bank) that gathers monitors of any type.
 * Stored in {@code orbit.groups.json}; {@code updatedBy} is the self-declared operator name.
 */
public record Group(
        String id,
        String name,
        String color,
        String icon,
        String description,
        String owner,
        List<String> tags,
        int order,
        Instant updatedAt,
        String updatedBy) implements ConfigItem {

    public Group {
        tags = tags == null ? List.of() : List.copyOf(tags);
    }

    public Group withOrder(int newOrder) {
        return new Group(id, name, color, icon, description, owner, tags, newOrder, updatedAt, updatedBy);
    }

    Group touchedBy(String operator, Instant at) {
        return new Group(id, name, color, icon, description, owner, tags, order, at, operator);
    }
}
