package io.orbit.monitor.definition;

import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Validation of the DNS, gRPC, Kafka and certificate check settings (BE-04/05/09/10). */
final class CheckProbeValidator {

    private static final Set<String> RECORD_TYPES = Set.of("A", "AAAA", "CNAME", "MX", "TXT", "NS");

    private CheckProbeValidator() {
    }

    static void validate(CheckMonitorDef c, List<String> errors) {
        CheckMonitorDef.Probe p = c.probe();
        switch (c.type()) {
            case DNS -> {
                DefinitionValidators.required(c.id(), "host", c.host(), errors);
                String type = p.recordType() == null ? "" : p.recordType().toUpperCase(Locale.ROOT);
                if (!RECORD_TYPES.contains(type)) {
                    errors.add(c.id() + ": probe.recordType must be A, AAAA, CNAME, MX, TXT or NS");
                }
            }
            case GRPC -> {
                DefinitionValidators.required(c.id(), "host", c.host(), errors);
                port(c, errors);
            }
            case KAFKA -> {
                DefinitionValidators.required(c.id(), "probe.bootstrapServers", p.bootstrapServers(), errors);
                DefinitionValidators.required(c.id(), "probe.consumerGroup", p.consumerGroup(), errors);
                DefinitionValidators.required(c.id(), "probe.topic", p.topic(), errors);
                if (p.bootstrapServers() != null) {
                    for (String server : p.bootstrapServers().split(",")) {
                        if (!server.strip().matches("[A-Za-z0-9._\\-\\[\\]:]+:\\d{1,5}")) {
                            errors.add(c.id() + ": probe.bootstrapServers must be host:port, comma separated");
                            break;
                        }
                    }
                }
            }
            case CERT -> {
                boolean hasHost = c.host() != null && !c.host().isBlank();
                boolean hasDomain = p.domain() != null && !p.domain().isBlank();
                if (!hasHost && !hasDomain) {
                    errors.add(c.id() + ": a certificate check needs a host or probe.domain");
                }
                if (hasHost && c.port() != null) {
                    port(c, errors);
                }
                if (hasDomain && !p.domain().strip().matches("(?i)[a-z0-9-]+(\\.[a-z0-9-]+)+")) {
                    errors.add(c.id() + ": probe.domain must be a domain name such as example.com");
                }
            }
            default -> {
                // TCP, ping and push are validated by DefinitionValidators
            }
        }
    }

    private static void port(CheckMonitorDef c, List<String> errors) {
        if (c.port() == null || c.port() < 1 || c.port() > 65_535) {
            errors.add(c.id() + ": port must be between 1 and 65535");
        }
    }
}
