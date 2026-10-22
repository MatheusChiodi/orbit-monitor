package io.orbit.api.runtime;

import io.orbit.probe.ping.PingProbe;
import io.orbit.probe.push.PushRegistry;
import io.orbit.probe.http.SsrfGuard;
import io.orbit.probe.tcp.TcpProbe;

/** Probes behind TCP, ping and push monitors; the SSRF guard keeps cloud metadata out of reach. */
public record SimpleProbes(TcpProbe tcp, PingProbe ping, PushRegistry push, SsrfGuard guard) {
}
