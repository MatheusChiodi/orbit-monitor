package io.orbit.probe.cert;

import io.orbit.common.MonitorState;
import io.orbit.probe.http.SsrfBlockedException;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * BE-05 check: TLS certificate of {@code host:port} and/or domain registration of {@code domain}.
 * The state follows the fewest days left ({@link ExpiryPolicy}: OK above 30, WARN up to 8, DOWN at
 * 7 or less); a certificate the JDK trust store rejects for the host name is at least WARN.
 */
public class CertificateProbe {

    /**
     * @param certDaysLeft   null when no host was checked
     * @param domainDaysLeft null when no domain was checked
     * @param warningStep    30, 14 or 7 once crossed (used to notify once per step)
     */
    public record Result(MonitorState state, Long certDaysLeft, Instant certExpiresAt, Long domainDaysLeft,
                         Instant domainExpiresAt, String subject, String issuer, Integer chainLength, Boolean trusted,
                         String trustError, Integer warningStep, long ms, String error) {

        /** Fewest days left of the certificate and the domain. */
        public Long daysLeft() {
            if (certDaysLeft == null) {
                return domainDaysLeft;
            }
            return domainDaysLeft == null ? certDaysLeft : Math.min(certDaysLeft, domainDaysLeft);
        }
    }

    private final TlsCertificateFetcher tls;
    private final RdapClient rdap;
    private final Clock clock;

    public CertificateProbe(TlsCertificateFetcher tls, RdapClient rdap, Clock clock) {
        this.tls = tls;
        this.rdap = rdap;
        this.clock = clock;
    }

    /** @param port null means 443 */
    public Result check(String host, Integer port, String domain, Duration timeout) {
        long start = System.nanoTime();
        TlsCertificateFetcher.CertificateInfo cert = null;
        if (host != null && !host.isBlank()) {
            try {
                cert = tls.fetch(host.strip(), port == null ? 443 : port, timeout);
            } catch (IOException | SsrfBlockedException e) {
                return failed("TLS handshake with " + host + " failed: " + e.getMessage(), start);
            }
        }
        RdapClient.DomainExpiry registration = null;
        if (domain != null && !domain.isBlank()) {
            registration = rdap.expiry(domain, timeout);
            if (registration.expiresAt() == null) {
                return failed(registration.error(), start);
            }
        }
        Long certDays = cert == null ? null : cert.daysLeft();
        Long domainDays = registration == null ? null
                : Duration.between(clock.instant(), registration.expiresAt()).toDays();
        Result partial = new Result(MonitorState.OK, certDays, cert == null ? null : cert.notAfter(), domainDays,
                registration == null ? null : registration.expiresAt(), cert == null ? null : cert.subject(),
                cert == null ? null : cert.issuer(), cert == null ? null : cert.chainLength(),
                cert == null ? null : cert.trusted(), cert == null ? null : cert.trustError(), null, 0, null);
        Long days = partial.daysLeft();
        MonitorState state = days == null ? MonitorState.UNKNOWN : ExpiryPolicy.stateFor(days);
        if (cert != null && !cert.trusted()) {
            state = MonitorState.worst(state, MonitorState.WARN);
        }
        Integer step = days == null ? null : ExpiryPolicy.warningStep(days).orElse(null);
        return new Result(state, certDays, partial.certExpiresAt(), domainDays, partial.domainExpiresAt(),
                partial.subject(), partial.issuer(), partial.chainLength(), partial.trusted(), partial.trustError(),
                step, elapsedMs(start), null);
    }

    private static Result failed(String error, long start) {
        return new Result(MonitorState.DOWN, null, null, null, null, null, null, null, null, null, null,
                elapsedMs(start), error);
    }

    private static long elapsedMs(long start) {
        return Duration.ofNanos(System.nanoTime() - start).toMillis();
    }
}
