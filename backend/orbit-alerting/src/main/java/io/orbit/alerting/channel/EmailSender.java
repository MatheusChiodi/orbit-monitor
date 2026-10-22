package io.orbit.alerting.channel;

import java.util.List;

/** BE-28: e-mail transport port (SMTP in production, a fake in tests). */
@FunctionalInterface
public interface EmailSender {

    /** Plain-text message; {@code password} is the resolved SMTP secret (null without authentication). */
    record EmailMessage(ChannelDef.Smtp smtp, String password, List<String> to, String subject, String body) {

        @Override
        public String toString() {
            return "EmailMessage[" + smtp.host() + ", to=" + to.size() + " recipient(s)]";
        }
    }

    void send(EmailMessage message) throws Exception;
}
