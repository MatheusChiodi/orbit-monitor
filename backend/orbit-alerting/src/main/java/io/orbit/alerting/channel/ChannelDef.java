package io.orbit.alerting.channel;

import io.orbit.config.ConfigItem;
import io.orbit.security.vault.SecretRef;

import java.util.List;

/**
 * A notification channel in orbit.channels.json. Webhook URLs carry tokens, so the URL itself is a
 * vault reference, as is the HMAC signing secret.
 *
 * @param groupIds    groups whose incidents reach this channel; empty means every group
 * @param minSeverity WARN or DOWN
 */
public record ChannelDef(String id, String name, Type type, SecretRef url, SecretRef signingSecret,
                         List<String> groupIds, String minSeverity, boolean enabled) implements ConfigItem {

    public enum Type { SLACK, TEAMS, WEBHOOK }

    public ChannelDef {
        groupIds = groupIds == null ? List.of() : List.copyOf(groupIds);
        minSeverity = minSeverity == null ? "DOWN" : minSeverity;
    }

    @Override
    public String toString() {
        return "ChannelDef[" + id + ", " + name + ", " + type + ", url=•••• (vault)]";
    }
}
