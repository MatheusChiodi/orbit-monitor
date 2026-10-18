package io.orbit.probe.http;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.List;

/** Resolução de nomes isolada para permitir testes do anti-SSRF sem DNS real. */
@FunctionalInterface
public interface HostResolver {

    List<InetAddress> resolve(String host) throws UnknownHostException;

    static HostResolver system() {
        return host -> List.of(InetAddress.getAllByName(host));
    }
}
