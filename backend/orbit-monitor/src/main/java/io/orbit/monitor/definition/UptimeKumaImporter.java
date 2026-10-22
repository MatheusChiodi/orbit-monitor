package io.orbit.monitor.definition;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.monitor.condition.Severity;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.IntStream;

/**
 * BE-43: maps an Uptime Kuma backup (JSON export) to Orbit HTTP monitors and groups. Kuma's
 * notification secrets and passwords are never imported; unsupported monitor types are reported.
 * The result is a proposal: nothing is saved here, the operator reviews it and saves through
 * {@link MonitorDefinitions}, so the usual validation applies.
 */
public final class UptimeKumaImporter {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Pattern STATUS_RANGE = Pattern.compile("^\\s*(\\d{3})\\s*-\\s*(\\d{3})\\s*$");
    private static final Pattern STATUS_CODE = Pattern.compile("^\\s*(\\d{3})\\s*$");
    private static final int MIN_INTERVAL_S = 15;
    private static final int MAX_INTERVAL_S = 86_400;
    private static final long MIN_TIMEOUT_MS = 100;
    private static final long MAX_TIMEOUT_MS = 300_000;
    /** Status lists up to this many codes are expanded into {@code in (...)}. */
    private static final int MAX_EXPANDED_CODES = 200;

    public record ImportedGroup(String id, String name) {
    }

    /**
     * @param skipped human-readable reasons for monitors that could not be mapped
     * @param notes   settings of imported monitors that were left out on purpose (credentials, bodies)
     */
    public record Result(List<HttpMonitorDef> requests, List<ImportedGroup> groups, List<String> skipped,
                         List<String> notes) {

        public Result {
            requests = List.copyOf(requests);
            groups = List.copyOf(groups);
            skipped = List.copyOf(skipped);
            notes = List.copyOf(notes);
        }
    }

    private UptimeKumaImporter() {
    }

    /** Parses the backup; throws {@link IllegalArgumentException} when it is not a Kuma JSON export. */
    public static Result parse(String kumaBackupJson) {
        JsonNode root;
        try {
            root = MAPPER.readTree(kumaBackupJson == null ? "" : kumaBackupJson);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Not a valid Uptime Kuma backup (invalid JSON)");
        }
        JsonNode list = root == null ? null : root.get("monitorList");
        if (list == null || !list.isArray()) {
            throw new IllegalArgumentException("Not a valid Uptime Kuma backup (monitorList is missing)");
        }

        Map<String, ImportedGroup> groups = new LinkedHashMap<>();
        for (JsonNode m : list) {
            if ("group".equals(type(m))) {
                String kumaId = m.path("id").asText();
                groups.put(kumaId, new ImportedGroup("grp_kuma_" + safeId(kumaId), name(m)));
            }
        }

        List<HttpMonitorDef> requests = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        List<String> notes = new ArrayList<>();
        for (JsonNode m : list) {
            String type = type(m);
            switch (type) {
                case "group" -> { }
                case "http", "keyword" -> requests.add(toRequest(m, type, groups, notes));
                default -> skipped.add(name(m) + ": monitor type '" + type + "' is not supported by the import");
            }
        }
        return new Result(requests, List.copyOf(groups.values()), skipped, notes);
    }

    private static HttpMonitorDef toRequest(JsonNode m, String type, Map<String, ImportedGroup> groups,
                                            List<String> notes) {
        String name = name(m);
        int interval = clamp(m.path("interval").asInt(60), MIN_INTERVAL_S, MAX_INTERVAL_S);
        double timeoutSeconds = m.path("timeout").asDouble(0);
        long timeoutMs = timeoutSeconds > 0 ? Math.round(timeoutSeconds * 1000) : interval * 800L;
        int downAfter = clamp(m.path("maxretries").asInt(0) + 1, 1, 10);
        String method = m.path("method").asText("GET").toUpperCase(Locale.ROOT);
        ImportedGroup group = groups.get(m.path("parent").asText(""));

        List<ConditionDef> conditions = new ArrayList<>();
        conditions.add(new ConditionDef(statusExpression(m.get("accepted_statuscodes")), Severity.DOWN));
        if (type.equals("keyword")) {
            String operator = m.path("invertKeyword").asBoolean(false) ? "not contains" : "contains";
            conditions.add(new ConditionDef("[BODY] " + operator + " \"" + m.path("keyword").asText("") + "\"",
                    Severity.DOWN));
        }

        if (hasText(m, "basic_auth_user") || hasText(m, "basic_auth_pass") || hasText(m, "authMethod")) {
            notes.add(name + ": authentication was not imported; add it as a secret header from the vault");
        }
        if (hasText(m, "headers")) {
            notes.add(name + ": headers were not imported (they may carry credentials); add them again");
        }
        if (hasText(m, "body")) {
            notes.add(name + ": request body was not imported; add it again");
        }

        return new HttpMonitorDef(
                "req_kuma_" + safeId(m.path("id").asText()),
                name,
                group == null ? null : group.id(),
                method,
                m.path("url").asText(""),
                Map.of(),
                Map.of(),
                null,
                interval,
                Math.clamp(timeoutMs, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS),
                m.path("maxredirects").asInt(10) > 0,
                downAfter,
                0.1,
                false,
                conditions,
                List.of(),
                m.has("active") && !m.path("active").asBoolean(true),
                null,
                null);
    }

    /** Kuma accepts a list of codes and ranges ({@code ["200-299"]}); Orbit uses one status condition. */
    static String statusExpression(JsonNode accepted) {
        List<int[]> ranges = new ArrayList<>();
        if (accepted != null && accepted.isArray()) {
            for (JsonNode entry : accepted) {
                Matcher range = STATUS_RANGE.matcher(entry.asText());
                Matcher code = STATUS_CODE.matcher(entry.asText());
                if (range.matches()) {
                    int low = Integer.parseInt(range.group(1));
                    int high = Integer.parseInt(range.group(2));
                    ranges.add(new int[]{Math.min(low, high), Math.max(low, high)});
                } else if (code.matches()) {
                    int c = Integer.parseInt(code.group(1));
                    ranges.add(new int[]{c, c});
                }
            }
        }
        if (ranges.isEmpty()) {
            ranges.add(new int[]{200, 299});
        }
        if (ranges.size() == 1) {
            int[] r = ranges.getFirst();
            return r[0] == r[1] ? "[STATUS] == " + r[0] : "[STATUS] between " + r[0] + " and " + r[1];
        }
        int total = ranges.stream().mapToInt(r -> r[1] - r[0] + 1).sum();
        if (total > MAX_EXPANDED_CODES) {
            int low = ranges.stream().mapToInt(r -> r[0]).min().orElse(200);
            int high = ranges.stream().mapToInt(r -> r[1]).max().orElse(299);
            return "[STATUS] between " + low + " and " + high;
        }
        List<String> codes = new ArrayList<>();
        ranges.stream().flatMapToInt(r -> IntStream.rangeClosed(r[0], r[1])).distinct().sorted()
                .forEach(c -> codes.add(String.valueOf(c)));
        return "[STATUS] in (" + String.join(", ", codes) + ")";
    }

    private static String type(JsonNode m) {
        return m.path("type").asText("unknown").toLowerCase(Locale.ROOT);
    }

    private static String name(JsonNode m) {
        String name = m.path("name").asText("").strip();
        return name.isEmpty() ? "Kuma monitor " + m.path("id").asText("?") : name;
    }

    private static boolean hasText(JsonNode m, String field) {
        JsonNode value = m.get(field);
        return value != null && !value.isNull() && !value.asText().isBlank();
    }

    private static String safeId(String kumaId) {
        String id = kumaId.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_-]", "");
        return id.isEmpty() ? "x" : id.substring(0, Math.min(id.length(), 40));
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
