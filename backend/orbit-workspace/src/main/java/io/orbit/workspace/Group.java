package io.orbit.workspace;

import io.orbit.config.ConfigItem;

import java.time.Instant;
import java.util.List;

/**
 * A system or team (Payments, Customer Portal, Core Bank) that gathers monitors of any type.
 * Stored in {@code orbit.groups.json}; {@code updatedBy} is the client kind that made the change.
 * {@code monitorOrder} is the manual order of the group's monitors (FE-13); membership itself is the
 * monitor's {@code groupId}.
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
        String updatedBy,
        List<String> monitorOrder) implements ConfigItem {

    public Group {
        tags = tags == null ? List.of() : List.copyOf(tags);
        monitorOrder = monitorOrder == null ? List.of() : List.copyOf(monitorOrder);
    }

    public Group(String id, String name, String color, String icon, String description, String owner,
                 List<String> tags, int order, Instant updatedAt, String updatedBy) {
        this(id, name, color, icon, description, owner, tags, order, updatedAt, updatedBy, List.of());
    }

    public Group withOrder(int newOrder) {
        return new Group(id, name, color, icon, description, owner, tags, newOrder, updatedAt, updatedBy, monitorOrder);
    }

    public Group withMonitorOrder(List<String> monitorIds) {
        return new Group(id, name, color, icon, description, owner, tags, order, updatedAt, updatedBy, monitorIds);
    }

    Group touchedBy(String operator, Instant at) {
        return new Group(id, name, color, icon, description, owner, tags, order, at, operator, monitorOrder);
    }
}
