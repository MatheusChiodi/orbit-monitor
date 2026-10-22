package io.orbit.common.privacy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class SensitiveDataRedactorTest {

    // Public test card numbers (never real cards).
    private static final String VISA_TEST = "4111111111111111";
    private static final String MASTERCARD_TEST_SPACED = "5555 5555 5555 4444";

    private final SensitiveDataRedactor redactor = new SensitiveDataRedactor();

    @ParameterizedTest
    @CsvSource({
            "CARD_NUMBER, PCI_PAN",
            "num_cartao, PCI_PAN",
            "pan, PCI_PAN",
            "cardNumber, PCI_PAN",
            "CVV, PCI_SAD",
            "cvv2, PCI_SAD",
            "track2, PCI_SAD",
            "PIN_BLOCK, PCI_SAD",
            "cpf, PERSONAL",
            "customer_email, PERSONAL",
            "TELEFONE, PERSONAL",
            "nome_cliente, PERSONAL",
            "password, SECRET",
            "senha, SECRET",
            "API_KEY, SECRET",
            "accessToken, SECRET",
            "company, NONE",
            "PENDING_QTY, NONE",
            "spin_rate, NONE"
    })
    void classifiesFieldNames(String name, DataClass expected) {
        assertThat(redactor.classifyName(name)).isEqualTo(expected);
    }

    @Test
    void luhnValidatesCardNumbers() {
        assertThat(Luhn.isValid(VISA_TEST)).isTrue();
        assertThat(Luhn.isValid("4111111111111112")).isFalse();
    }

    @Test
    void panInsideTextKeepsOnlyLastFourDigits() {
        String masked = redactor.redactText("card " + MASTERCARD_TEST_SPACED + " declined");

        assertThat(masked).isEqualTo("card •••• •••• •••• 4444 declined");
        assertThat(masked).doesNotContain("5555 5555");
    }

    @Test
    void numericPanValueIsMasked() {
        assertThat(redactor.redact("ref", Long.parseLong(VISA_TEST))).isEqualTo("•••• •••• •••• 1111");
        assertThat(redactor.redact("ref", new BigDecimal(VISA_TEST))).isEqualTo("•••• •••• •••• 1111");
    }

    @Test
    void ordinaryNumbersAreKept() {
        assertThat(redactor.redact("PENDING_QTY", 347)).isEqualTo(347);
        assertThat(redactor.redact("amount", new BigDecimal("10.50"))).isEqualTo(new BigDecimal("10.50"));
        assertThat(redactor.redact("order_id", 4111111111111112L)).isEqualTo(4111111111111112L);
    }

    @Test
    void sensitiveAuthenticationDataIsFullyRedacted() {
        assertThat(redactor.redact("cvv", "123")).isEqualTo("[REDACTED]");
        assertThat(redactor.redact("track1", "%B4111...")).isEqualTo("[REDACTED]");
    }

    @Test
    void panColumnIsMaskedEvenWhenValueIsNotLuhnValid() {
        assertThat(redactor.redact("card_number", "1234")).isEqualTo("••••");
        assertThat(redactor.redact("card_number", VISA_TEST)).isEqualTo("•••• •••• •••• 1111");
    }

    @Test
    void cpfAndCnpjAreMasked() {
        assertThat(redactor.redactText("CPF 529.982.247-25 ok")).isEqualTo("CPF •••.•••.•••-25 ok");
        assertThat(redactor.redactText("52998224725")).isEqualTo("•••.•••.•••-25");
        assertThat(redactor.redactText("11.222.333/0001-81")).isEqualTo("••.•••.•••/••••-81");
        assertThat(redactor.redactText("123.456.789-00")).isEqualTo("123.456.789-00");
    }

    @Test
    void emailAndPhoneAreMasked() {
        assertThat(redactor.redactText("contact joao.silva@domain.com now")).isEqualTo("contact j•••@d•••.com now");
        assertThat(redactor.redactText("call (11) 98765-4321")).isEqualTo("call (••) •••••-4321");
    }

    @Test
    void jwtAndBearerTokensAreMasked() {
        String jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl";
        assertThat(redactor.redactText("token=" + jwt)).isEqualTo("token=••••");
        assertThat(redactor.redactText("Authorization: Bearer abc.def-123")).isEqualTo("Authorization: Bearer ••••");
    }

    @Test
    void keyValueSecretsInTextAreMasked() {
        assertThat(redactor.redactText("user=core password=hunter2;timeout=5"))
                .isEqualTo("user=core password=••••;timeout=5");
        assertThat(redactor.redactText("{\"api_key\": \"abc123\"}")).isEqualTo("{\"api_key\": \"••••\"}");
        assertThat(redactor.redactText("\"password\": \"${env:CORE_DB_PASSWORD}\""))
                .isEqualTo("\"password\": \"${env:CORE_DB_PASSWORD}\"");
    }

    @Test
    void personalFieldByNameIsMaskedGenerically() {
        assertThat(redactor.redact("customer_name", "Maria Silva")).isEqualTo("M•••");
        assertThat(redactor.redact("cpf", "529.982.247-25")).isEqualTo("•••.•••.•••-25");
        assertThat(redactor.redact("email", "x@y.io")).isEqualTo("x•••@y•••.io");
    }

    @Test
    void secretsAreAlwaysDots() {
        assertThat(redactor.redact("password", "hunter2")).isEqualTo("••••");
    }

    @Test
    void nullStaysNull() {
        assertThat(redactor.redact("cvv", null)).isNull();
        assertThat(redactor.redactText(null)).isNull();
    }

    @Test
    void panNextToOtherNumbersIsStillMasked() {
        assertThat(redactor.redactText("order 7 " + VISA_TEST + " paid"))
                .isEqualTo("order 7 •••• •••• •••• 1111 paid");
        // "12 5555 5555 5555" is Luhn-valid too: overlapping spans are masked together, nothing leaks.
        assertThat(redactor.redactText("order 12 " + MASTERCARD_TEST_SPACED + " paid"))
                .isEqualTo("order •••• •••• •••• 4444 paid");
        assertThat(redactor.redactText("2026-10-17 " + VISA_TEST + " declined"))
                .isEqualTo("2026-10-17 •••• •••• •••• 1111 declined");
        assertThat(redactor.redactText(VISA_TEST + " 99")).isEqualTo("•••• •••• •••• 1111 99");
    }

    @Test
    void floatingPointPanValueIsMasked() {
        assertThat(redactor.redact("value", Double.parseDouble(VISA_TEST))).isEqualTo("•••• •••• •••• 1111");
        assertThat(redactor.redact("value", 0.5d)).isEqualTo(0.5d);
        assertThat(redactor.redact("value", 1729250000001.0d)).isEqualTo(1729250000001.0d);
        assertThat(redactor.redact("value", Double.NaN)).isEqualTo(Double.NaN);
        assertThat(redactor.redact("ratio", 1.5f)).isEqualTo(1.5f);
    }

    @Test
    void cardNumbersAloneCanBeMaskedAndDetected() {
        assertThat(redactor.maskCardNumbers("a@b.com " + VISA_TEST)).isEqualTo("a@b.com •••• •••• •••• 1111");
        assertThat(redactor.maskCardNumbers(null)).isNull();
        assertThat(redactor.containsCardNumber("x 12 " + MASTERCARD_TEST_SPACED)).isTrue();
        assertThat(redactor.containsCardNumber("4111111111111112 and 2026-10-18")).isFalse();
        assertThat(redactor.containsCardNumber(null)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"OK", "UP", "347", "2026-10-18T10:00:00", "status=DEGRADED"})
    void harmlessTextIsUntouched(String text) {
        assertThat(redactor.redactText(text)).isEqualTo(text);
    }
}
