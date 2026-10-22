package io.orbit.alerting.channel;

import com.icegreen.greenmail.junit5.GreenMailExtension;
import com.icegreen.greenmail.util.GreenMailUtil;
import com.icegreen.greenmail.util.ServerSetupTest;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-28 SMTP e-mail against a local SMTP server")
class SmtpEmailSenderTest {

    @RegisterExtension
    static final GreenMailExtension SMTP = new GreenMailExtension(ServerSetupTest.SMTP)
            .withConfiguration(com.icegreen.greenmail.configuration.GreenMailConfiguration.aConfig()
                    .withUser("orbit", "smtp-pass"));

    private final SmtpEmailSender sender = new SmtpEmailSender();

    private ChannelDef.Smtp smtp() {
        return new ChannelDef.Smtp("127.0.0.1", SMTP.getSmtp().getPort(), "orbit", "orbit@example.com", "NONE");
    }

    @Test
    @DisplayName("sends a UTF-8 plain-text message to every recipient with authentication")
    void sends() throws Exception {
        sender.send(new EmailSender.EmailMessage(smtp(), "smtp-pass", List.of("ops@example.com", "noc@example.com"),
                "Fila está fora do ar", "QTY 347 > 200\n\nhttp://orbit.local/incidents/inc_1"));

        MimeMessage[] received = SMTP.getReceivedMessages();
        assertThat(received).hasSize(2);
        assertThat(received[0].getSubject()).isEqualTo("Fila está fora do ar");
        assertThat(received[0].getFrom()[0].toString()).isEqualTo("orbit@example.com");
        assertThat(GreenMailUtil.getBody(received[0])).contains("QTY 347");
    }

    @Test
    @DisplayName("a wrong password fails without echoing it")
    void wrongPassword() {
        assertThatThrownBy(() -> sender.send(new EmailSender.EmailMessage(smtp(), "wrong-pass",
                List.of("ops@example.com"), "s", "b"))).hasMessageNotContaining("wrong-pass");
    }
}
