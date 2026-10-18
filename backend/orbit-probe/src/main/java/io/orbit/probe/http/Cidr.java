package io.orbit.probe.http;

import java.net.InetAddress;
import java.net.UnknownHostException;

/** Faixa de endereços IPv4/IPv6 em notação CIDR ({@code 10.0.0.0/8}, {@code fc00::/7}). */
public record Cidr(byte[] network, int prefixLength) {

    public static Cidr parse(String text) {
        String[] parts = text.trim().split("/");
        if (parts.length != 2) {
            throw new IllegalArgumentException("CIDR inválido: " + text);
        }
        try {
            byte[] network = InetAddress.getByName(parts[0]).getAddress();
            int prefix = Integer.parseInt(parts[1]);
            if (prefix < 0 || prefix > network.length * 8) {
                throw new IllegalArgumentException("Prefixo inválido: " + text);
            }
            return new Cidr(network, prefix);
        } catch (UnknownHostException | NumberFormatException e) {
            throw new IllegalArgumentException("CIDR inválido: " + text, e);
        }
    }

    public static boolean looksLikeCidr(String text) {
        return text.contains("/");
    }

    public boolean contains(InetAddress address) {
        byte[] candidate = address.getAddress();
        if (candidate.length != network.length) {
            return false;
        }
        int fullBytes = prefixLength / 8;
        for (int i = 0; i < fullBytes; i++) {
            if (candidate[i] != network[i]) {
                return false;
            }
        }
        int remainingBits = prefixLength % 8;
        if (remainingBits == 0) {
            return true;
        }
        int mask = (0xFF << (8 - remainingBits)) & 0xFF;
        return (candidate[fullBytes] & mask) == (network[fullBytes] & mask);
    }
}
