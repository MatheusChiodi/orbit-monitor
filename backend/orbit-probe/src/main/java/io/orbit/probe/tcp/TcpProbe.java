package io.orbit.probe.tcp;

import java.io.IOException;
import java.net.ConnectException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.time.Duration;

/** BE-01: TCP port check with connect time; distinguishes refused from timeout. */
public class TcpProbe {

    /** Why a connection did not open. */
    public enum Failure { REFUSED, TIMEOUT, UNRESOLVED }

    /** @param failure null when the port is open */
    public record TcpResult(boolean open, long connectMs, Failure failure) {
    }

    public TcpResult check(String host, int port, Duration timeout) {
        long start = System.nanoTime();
        InetSocketAddress address = new InetSocketAddress(host, port);
        if (address.isUnresolved()) {
            return new TcpResult(false, 0, Failure.UNRESOLVED);
        }
        try (Socket socket = new Socket()) {
            socket.connect(address, (int) Math.max(1, timeout.toMillis()));
            return new TcpResult(true, elapsedMs(start), null);
        } catch (SocketTimeoutException e) {
            return new TcpResult(false, elapsedMs(start), Failure.TIMEOUT);
        } catch (ConnectException e) {
            boolean timedOut = e.getMessage() != null && e.getMessage().toLowerCase().contains("timed out");
            return new TcpResult(false, elapsedMs(start), timedOut ? Failure.TIMEOUT : Failure.REFUSED);
        } catch (UnknownHostException e) {
            return new TcpResult(false, elapsedMs(start), Failure.UNRESOLVED);
        } catch (IOException e) {
            return new TcpResult(false, elapsedMs(start), Failure.REFUSED);
        }
    }

    private static long elapsedMs(long startNanos) {
        return (System.nanoTime() - startNanos) / 1_000_000;
    }
}
