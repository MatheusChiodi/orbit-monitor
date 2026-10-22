package io.orbit.probe.dns;

import javax.naming.NamingEnumeration;
import javax.naming.NamingException;
import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Hashtable;
import java.util.List;

/**
 * BE-04 production resolver: JNDI DNS ({@code com.sun.jndi.dns}, part of the JDK), so A, AAAA,
 * CNAME, MX, TXT and NS records are read without a DNS library. Uses the system resolvers unless a
 * server is given. JNDI retries with a doubling timeout, so the initial timeout is half the budget.
 */
public class JndiDnsResolver implements DnsProbe.DnsResolver {

    private final String server;
    private final Duration timeout;

    /** @param server DNS server ({@code 1.1.1.1}); null uses the system configuration */
    public JndiDnsResolver(String server, Duration timeout) {
        this.server = server;
        this.timeout = timeout;
    }

    @Override
    public List<String> lookup(String name, DnsProbe.RecordType type) throws NamingException {
        DirContext context = new InitialDirContext(environment(server, timeout));
        try {
            return values(context.getAttributes(name, new String[] {type.name()}), type);
        } finally {
            context.close();
        }
    }

    static Hashtable<String, String> environment(String server, Duration timeout) {
        Hashtable<String, String> env = new Hashtable<>();
        env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
        env.put("java.naming.provider.url", server == null || server.isBlank() ? "dns:" : "dns://" + server);
        env.put("com.sun.jndi.dns.timeout.initial", String.valueOf(Math.max(100, timeout.toMillis() / 2)));
        env.put("com.sun.jndi.dns.timeout.retries", "2");
        return env;
    }

    static List<String> values(Attributes attributes, DnsProbe.RecordType type) throws NamingException {
        Attribute attribute = attributes.get(type.name());
        List<String> values = new ArrayList<>();
        if (attribute == null) {
            return values;
        }
        NamingEnumeration<?> all = attribute.getAll();
        while (all.hasMore()) {
            String value = String.valueOf(all.next());
            if (type == DnsProbe.RecordType.TXT && value.length() >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
                value = value.substring(1, value.length() - 1);
            }
            values.add(value);
        }
        return values;
    }
}
