package io.orbit.history.codec;

import org.junit.jupiter.api.Test;

import java.nio.ByteBuffer;

import static org.assertj.core.api.Assertions.assertThat;

class VarintTest {

    @Test
    void roundTripsUnsignedValuesWithMinimalBytes() {
        ByteSink sink = new ByteSink(16);
        Varint.writeUnsigned(sink, 0);
        Varint.writeUnsigned(sink, 127);
        Varint.writeUnsigned(sink, 30_000);
        Varint.writeUnsigned(sink, Long.MAX_VALUE);

        assertThat(sink.size()).isEqualTo(1 + 1 + 3 + 9);
        ByteBuffer in = sink.toBuffer();
        assertThat(Varint.readUnsigned(in)).isZero();
        assertThat(Varint.readUnsigned(in)).isEqualTo(127);
        assertThat(Varint.readUnsigned(in)).isEqualTo(30_000);
        assertThat(Varint.readUnsigned(in)).isEqualTo(Long.MAX_VALUE);
    }

    @Test
    void zigZagKeepsSmallNegativeNumbersSmall() {
        ByteSink sink = new ByteSink(16);
        Varint.writeSigned(sink, -1);
        Varint.writeSigned(sink, 63);
        Varint.writeSigned(sink, -64);
        Varint.writeSigned(sink, Long.MIN_VALUE);

        assertThat(sink.size()).isEqualTo(1 + 1 + 1 + 10);
        ByteBuffer in = sink.toBuffer();
        assertThat(Varint.readSigned(in)).isEqualTo(-1);
        assertThat(Varint.readSigned(in)).isEqualTo(63);
        assertThat(Varint.readSigned(in)).isEqualTo(-64);
        assertThat(Varint.readSigned(in)).isEqualTo(Long.MIN_VALUE);
    }
}
