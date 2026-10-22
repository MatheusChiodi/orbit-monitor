package io.orbit.alerting.channel;

import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.Properties;

/**
 * BE-28: SMTP e-mail through Jakarta Mail (Eclipse Angus). One session per message with the channel's
 * own server settings; STARTTLS is required unless the channel says NONE, TLS uses an implicit TLS
 * socket, and the server identity is always checked.
 */
public class SmtpEmailSender implements EmailSender {

    private static final String TIMEOUT = Long.toString(Duration.ofSeconds(15).toMillis());

    @Override
    public void send(EmailMessage message) throws Exception {
        ChannelDef.Smtp smtp = message.smtp();
        String security = smtp.securityOrDefault();
        Properties props = new Properties();
        props.put("mail.transport.protocol", "TLS".equals(security) ? "smtps" : "smtp");
        String prefix = "TLS".equals(security) ? "mail.smtps." : "mail.smtp.";
        props.put(prefix + "host", smtp.host());
        props.put(prefix + "port", Integer.toString(smtp.portOrDefault()));
        props.put(prefix + "connectiontimeout", TIMEOUT);
        props.put(prefix + "timeout", TIMEOUT);
        props.put(prefix + "writetimeout", TIMEOUT);
        props.put(prefix + "ssl.checkserveridentity", "true");
        if ("STARTTLS".equals(security)) {
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
        }
        boolean auth = smtp.username() != null && !smtp.username().isBlank() && message.password() != null;
        props.put(prefix + "auth", Boolean.toString(auth));
        Session session = auth
                ? Session.getInstance(props, new Authenticator() {
                    @Override
                    protected PasswordAuthentication getPasswordAuthentication() {
                        return new PasswordAuthentication(smtp.username(), message.password());
                    }
                })
                : Session.getInstance(props);

        MimeMessage mime = new MimeMessage(session);
        mime.setFrom(new InternetAddress(smtp.from(), true));
        for (String to : message.to()) {
            mime.addRecipient(Message.RecipientType.TO, new InternetAddress(to, true));
        }
        mime.setSubject(message.subject(), StandardCharsets.UTF_8.name());
        mime.setText(message.body(), StandardCharsets.UTF_8.name());
        mime.setSentDate(new Date());
        mime.setHeader("Auto-Submitted", "auto-generated");
        Transport.send(mime);
    }
}
