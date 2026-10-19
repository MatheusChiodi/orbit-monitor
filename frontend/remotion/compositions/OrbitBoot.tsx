import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { DEFAULT_PALETTE, EASE_OUT, FONT_DISPLAY, FONT_SANS, type Palette } from '../palette';
import { RemotionOrb } from './RemotionOrb';

export type OrbitBootProps = {
  title: string;
  tagline: string;
  palette: Palette;
};

export const ORBIT_BOOT_DEFAULTS: OrbitBootProps = {
  title: 'Orbit',
  tagline: 'Websites, APIs and databases, watched from one wall.',
  palette: DEFAULT_PALETTE,
};

const ease = Easing.bezier(...EASE_OUT);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Boot timeline: orbit lines draw in, the orb lights up, the ring powers on, then the wordmark. */
export function bootTimeline(frame: number, fps: number) {
  const s = (seconds: number) => seconds * fps;
  return {
    lines: interpolate(frame, [0, s(1.6)], [0, 1], { ...clamp, easing: ease }),
    orb: interpolate(frame, [s(0.3), s(1.4)], [0, 1], { ...clamp, easing: ease }),
    ring: interpolate(frame, [s(1.0), s(2.2)], [0, 1], { ...clamp, easing: ease }),
    text: interpolate(frame, [s(1.9), s(2.8)], [0, 1], { ...clamp, easing: ease }),
  };
}

function OrbitLines({ progress, palette }: { progress: number; palette: Palette }) {
  const { width, height } = useVideoConfig();
  return (
    <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }} aria-hidden>
      {[0.24, 0.34, 0.46, 0.6].map((r, i) => {
        const rx = width * r;
        const ry = rx * 0.3;
        const length = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
        return (
          <ellipse
            key={r}
            cx={width / 2}
            cy={height * 0.42}
            rx={rx}
            ry={ry}
            fill="none"
            stroke={i % 2 ? palette.green : palette.blue}
            strokeOpacity={0.14 - i * 0.02}
            strokeWidth={1.2}
            strokeDasharray={length}
            strokeDashoffset={length * (1 - progress)}
            transform={`rotate(-12 ${width / 2} ${height * 0.42})`}
          />
        );
      })}
    </svg>
  );
}

export function OrbitBoot({ title, tagline, palette }: OrbitBootProps) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = bootTimeline(frame, fps);
  const canvasHeight = Math.round(height * 0.66);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(60% 55% at 50% 40%, color-mix(in srgb, ${palette.blue} 9%, ${palette.bg}), ${palette.bg})`,
      }}
    >
      <OrbitLines progress={t.lines} palette={palette} />
      <div style={{ position: 'absolute', top: height * 0.06, left: 0, opacity: t.orb, transform: `scale(${0.94 + 0.06 * t.orb})` }}>
        <ThreeCanvas width={width} height={canvasHeight} camera={{ position: [0, 0, 4.6], fov: 36 }} gl={{ alpha: true }}>
          <RemotionOrb time={frame / fps} palette={{ blue: palette.blue, green: palette.green }} ring={t.ring} />
        </ThreeCanvas>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: height * 0.7,
          textAlign: 'center',
          opacity: t.text,
          transform: `translateY(${8 * (1 - t.text)}px)`,
        }}
      >
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: height * 0.1, color: palette.text, letterSpacing: '-0.02em' }}>
          {title}
        </div>
        <div style={{ fontFamily: FONT_SANS, fontSize: height * 0.034, color: palette.muted, marginTop: height * 0.012 }}>{tagline}</div>
      </div>
    </AbsoluteFill>
  );
}
