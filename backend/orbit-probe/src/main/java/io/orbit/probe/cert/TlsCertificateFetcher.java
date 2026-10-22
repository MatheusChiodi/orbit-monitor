package io.orbit.probe.cert;

import io.orbit.probe.http.SsrfGuard;

import javax.net.ssl.SNIHostName;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLEngine;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.TrustManager;
import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509ExtendedTrustManager;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * BE-05: reads the server certificate with a TLS handshake (JDK only) and reports days left,
 * subject, issuer, chain length and whether the JDK trust store accepts it for the host name.
 * An untrusted or expired certificate does not abort the handshake: Orbit sends no application data,
 * it only needs to read the chain. The SSRF guard runs before the TCP connection is opened.
 */
public class TlsCertificateFetcher {

    /** @param trustError why the chain is not trusted for the host name; null when trusted */
    public record CertificateInfo(long daysLeft, Instant notAfter, String subject, String issuer, int chainLength,
                                  boolean trusted, String trustError, long ms) {
    }

    private final SsrfGuard guard;
    private final Clock clock;
    private final X509ExtendedTrustManager trust;

    public TlsCertificateFetcher(SsrfGuard guard, Clock clock) {
        this(guard, clock, defaultTrust());
    }

    public TlsCertificateFetcher(SsrfGuard guard, Clock clock, X509ExtendedTrustManager trust) {
        this.guard = guard;
        this.clock = clock;
        this.trust = trust;
    }

    public CertificateInfo fetch(String host, int port, Duration timeout) throws IOException {
        guard.check(URI.create("https://" + host + ":" + port));
        long start = System.nanoTime();
        Recorder recorder = new Recorder(trust);
        SSLContext context;
        try {
            context = SSLContext.getInstance("TLS");
            context.init(null, new TrustManager[] {recorder}, null);
        } catch (GeneralSecurityException e) {
            throw new IOException("TLS unavailable: " + e.getMessage(), e);
        }
        int timeoutMs = (int) Math.min(Integer.MAX_VALUE, Math.max(1, timeout.toMillis()));
        try (Socket plain = new Socket()) {
            plain.connect(new InetSocketAddress(host, port), timeoutMs);
            plain.setSoTimeout(timeoutMs);
            try (SSLSocket tls = (SSLSocket) context.getSocketFactory().createSocket(plain, host, port, true)) {
                SSLParameters parameters = tls.getSSLParameters();
                parameters.setEndpointIdentificationAlgorithm("HTTPS");
                if (!host.matches("[0-9.]+") && !host.contains(":")) {
                    parameters.setServerNames(List.of(new SNIHostName(host)));
                }
                tls.setSSLParameters(parameters);
                tls.startHandshake();
            }
        }
        X509Certificate[] chain = recorder.chain;
        if (chain == null || chain.length == 0) {
            throw new IOException("The server sent no certificate");
        }
        X509Certificate leaf = chain[0];
        Instant notAfter = leaf.getNotAfter().toInstant();
        long ms = Duration.ofNanos(System.nanoTime() - start).toMillis();
        return new CertificateInfo(Duration.between(clock.instant(), notAfter).toDays(), notAfter,
                leaf.getSubjectX500Principal().getName(), leaf.getIssuerX500Principal().getName(), chain.length,
                recorder.error == null, recorder.error, ms);
    }

    private static X509ExtendedTrustManager defaultTrust() {
        try {
            TrustManagerFactory factory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
            factory.init((KeyStore) null);
            for (TrustManager manager : factory.getTrustManagers()) {
                if (manager instanceof X509ExtendedTrustManager extended) {
                    return extended;
                }
            }
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("No default trust manager", e);
        }
        throw new IllegalStateException("No default trust manager");
    }

    /** Records the chain and the verdict of the real trust manager without failing the handshake. */
    private static final class Recorder extends X509ExtendedTrustManager {

        private final X509ExtendedTrustManager delegate;
        private volatile X509Certificate[] chain;
        private volatile String error;

        Recorder(X509ExtendedTrustManager delegate) {
            this.delegate = delegate;
        }

        @Override
        public void checkServerTrusted(X509Certificate[] certificates, String authType, Socket socket) {
            chain = certificates.clone();
            try {
                delegate.checkServerTrusted(certificates, authType, socket);
            } catch (CertificateException e) {
                error = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            }
        }

        @Override
        public void checkServerTrusted(X509Certificate[] certificates, String authType, SSLEngine engine) {
            chain = certificates.clone();
            try {
                delegate.checkServerTrusted(certificates, authType, engine);
            } catch (CertificateException e) {
                error = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            }
        }

        @Override
        public void checkServerTrusted(X509Certificate[] certificates, String authType) {
            chain = certificates.clone();
            try {
                delegate.checkServerTrusted(certificates, authType);
            } catch (CertificateException e) {
                error = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            }
        }

        @Override
        public void checkClientTrusted(X509Certificate[] certificates, String authType, Socket socket)
                throws CertificateException {
            throw new CertificateException("client certificates are not accepted");
        }

        @Override
        public void checkClientTrusted(X509Certificate[] certificates, String authType, SSLEngine engine)
                throws CertificateException {
            throw new CertificateException("client certificates are not accepted");
        }

        @Override
        public void checkClientTrusted(X509Certificate[] certificates, String authType) throws CertificateException {
            throw new CertificateException("client certificates are not accepted");
        }

        @Override
        public X509Certificate[] getAcceptedIssuers() {
            return new X509Certificate[0];
        }
    }
}
