package io.orbit.probe.http;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.List;

/** Name resolution behind an interface so SSRF tests run without real DNS. */
@FunctionalInterface
public interface HostResolver {

    List<InetAddress> resolve(String host) throws UnknownHostException;

    static HostResolver system() {
        return host -> List.of(InetAddress.getAllByName(host));
    }
}
