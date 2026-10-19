package io.orbit.history.codec;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CompressionTest {

    private static final byte[] DATA = "orbit ".repeat(2_000).getBytes(StandardCharsets.US_ASCII);

    @Test
    void zstdIsAvailableOnThisPlatformAndRoundTrips() {
        assertThat(Compression.preferred()).isEqualTo(Compression.ZSTD);
        byte[] packed = Compression.ZSTD.compress(DATA);

        assertThat(packed.length).isLessThan(DATA.length / 20);
        assertThat(Compression.ZSTD.decompress(packed, DATA.length)).isEqualTo(DATA);
    }

    @Test
    void deflateFallbackRoundTrips() {
        byte[] packed = Compression.DEFLATE.compress(DATA);

        assertThat(packed.length).isLessThan(DATA.length / 20);
        assertThat(Compression.DEFLATE.decompress(packed, DATA.length)).isEqualTo(DATA);
    }

    @Test
    void codecIsIdentifiedByItsByte() {
        assertThat(Compression.of(Compression.ZSTD.id())).isEqualTo(Compression.ZSTD);
        assertThat(Compression.of(Compression.DEFLATE.id())).isEqualTo(Compression.DEFLATE);
        assertThatThrownBy(() -> Compression.of((byte) 99)).isInstanceOf(CorruptDataException.class);
    }

    @Test
    void wrongLengthIsReportedAsCorruption() {
        byte[] packed = Compression.DEFLATE.compress(DATA);

        assertThatThrownBy(() -> Compression.DEFLATE.decompress(packed, DATA.length + 1))
                .isInstanceOf(CorruptDataException.class);
    }
}
