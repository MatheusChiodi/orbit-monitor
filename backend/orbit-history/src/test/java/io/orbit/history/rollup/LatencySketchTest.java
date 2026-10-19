package io.orbit.history.rollup;

import io.orbit.history.codec.ByteSink;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Random;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class LatencySketchTest {

    @Test
    void quantilesStayWithinTheRelativeAccuracy() {
        Random random = new Random(3);
        int[] samples = new int[10_000];
        LatencySketch sketch = new LatencySketch();
        for (int i = 0; i < samples.length; i++) {
            samples[i] = 20 + (int) Math.abs(random.nextGaussian() * 200);
            sketch.add(samples[i]);
        }
        Arrays.sort(samples);

        for (double q : new double[] {0.5, 0.95, 0.99}) {
            double exact = samples[(int) Math.ceil(q * samples.length) - 1];
            assertThat(sketch.quantile(q)).isCloseTo(exact, within(exact * 0.02 + 1));
        }
        assertThat(sketch.count()).isEqualTo(10_000);
    }

    @Test
    void mergedSketchesEqualOneSketchOfAllSamples() {
        LatencySketch a = new LatencySketch();
        LatencySketch b = new LatencySketch();
        LatencySketch all = new LatencySketch();
        for (int i = 0; i < 500; i++) {
            a.add(i);
            all.add(i);
            b.add(1_000 + i);
            all.add(1_000 + i);
        }
        a.merge(b);

        assertThat(a.quantile(0.95)).isEqualTo(all.quantile(0.95));
        assertThat(a.count()).isEqualTo(1_000);
    }

    @Test
    void anHourOfChecksSerializesToAboutOneHundredBytes() {
        Random random = new Random(11);
        LatencySketch sketch = new LatencySketch();
        for (int i = 0; i < 120; i++) {
            sketch.add(90 + random.nextInt(50));
        }
        sketch.add(0);

        ByteSink out = new ByteSink(64);
        sketch.write(out);

        assertThat(out.size()).isLessThan(130);
        LatencySketch back = LatencySketch.read(out.toBuffer());
        assertThat(back.quantile(0.5)).isEqualTo(sketch.quantile(0.5));
        assertThat(back.count()).isEqualTo(121);
    }

    @Test
    void emptySketchHasNoQuantile() {
        assertThat(new LatencySketch().quantile(0.95)).isNaN();
    }
}
