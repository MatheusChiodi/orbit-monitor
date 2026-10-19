import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { DEFAULT_PALETTE, EASE_OUT, FONT_DISPLAY, FONT_MONO, FONT_SANS, type Palette } from '../palette';

export type FlowTone = 'info' | 'warn' | 'down' | 'ok';

export type FlowStep = {
  title: string;
  detail: string;
  tone: FlowTone;
};

export type CheckFlowProps = {
  heading: string;
  steps: FlowStep[];
  palette: Palette;
};

export const CHECK_FLOW_DEFAULTS: CheckFlowProps = {
  heading: 'How a check flows',
  steps: [
    { title: 'Probe', detail: 'SELECT · 30 s', tone: 'info' },
    { title: 'Reading', detail: 'QTY = 349', tone: 'info' },
    { title: 'Rule', detail: 'rule QTY < 200', tone: 'warn' },
    { title: 'State', detail: 'DOWN', tone: 'down' },
    { title: 'Wall', detail: 'Hero + alert', tone: 'ok' },
  ],
  palette: DEFAULT_PALETTE,
};

const ease = Easing.bezier(...EASE_OUT);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Pulse position along the track (0..1) and how lit each of `count` nodes is (0..1). */
export function flowTimeline(frame: number, fps: number, count: number) {
  const start = fps * 0.8;
  const travel = fps * 3.6;
  const pulse = interpolate(frame, [start, start + travel], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const lit = Array.from({ length: count }, (_, i) => {
    const at = count === 1 ? 0 : i / (count - 1);
    return interpolate(pulse, [at - 0.08, at], [0, 1], clamp);
  });
  const intro = interpolate(frame, [0, fps * 0.7], [0, 1], { ...clamp, easing: ease });
  return { pulse, lit, intro };
}

export function CheckFlow({ heading, steps, palette }: CheckFlowProps) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { pulse, lit, intro } = flowTimeline(frame, fps, steps.length);
  const toneColor: Record<FlowTone, string> = { info: palette.blue, warn: palette.warn, down: palette.down, ok: palette.green };
  const margin = width * 0.1;
  const track = width - margin * 2;
  const y = height * 0.46;
  const nodeWidth = Math.min((track / Math.max(1, steps.length - 1)) * 0.86, width * 0.19);

  return (
    <AbsoluteFill style={{ background: palette.bg, fontFamily: FONT_SANS }}>
      <div
        style={{
          position: 'absolute',
          top: height * 0.13,
          width: '100%',
          textAlign: 'center',
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: height * 0.065,
          color: palette.text,
          opacity: intro,
          transform: `translateY(${6 * (1 - intro)}px)`,
        }}
      >
        {heading}
      </div>
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }} aria-hidden>
        <defs>
          <linearGradient id="flow" x1="0" x2="1">
            <stop offset="0" stopColor={palette.blue} />
            <stop offset="1" stopColor={palette.green} />
          </linearGradient>
        </defs>
        <line x1={margin} x2={margin + track} y1={y} y2={y} stroke={palette.line} strokeWidth={2} opacity={intro} />
        <line x1={margin} x2={margin + track * pulse} y1={y} y2={y} stroke="url(#flow)" strokeWidth={2.5} />
        <circle cx={margin + track * pulse} cy={y} r={7} fill={palette.text} opacity={pulse > 0 && pulse < 1 ? 1 : 0} />
        <circle cx={margin + track * pulse} cy={y} r={18} fill={palette.blue} opacity={pulse > 0 && pulse < 1 ? 0.18 : 0} />
      </svg>
      {steps.map((step, i) => {
        const x = margin + (steps.length === 1 ? 0 : (track * i) / (steps.length - 1));
        const on = lit[i] ?? 0;
        const color = toneColor[step.tone];
        return (
          <div
            key={step.title}
            style={{
              position: 'absolute',
              left: x - nodeWidth / 2,
              top: y + 34,
              width: nodeWidth,
              boxSizing: 'border-box',
              padding: '14px 10px',
              textAlign: 'center',
              borderRadius: 14,
              background: `color-mix(in srgb, ${palette.surface} 85%, transparent)`,
              border: `1px solid ${on > 0.5 ? `color-mix(in srgb, ${color} 60%, transparent)` : palette.line}`,
              opacity: 0.35 + 0.65 * Math.max(on, intro * 0.4),
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: nodeWidth / 2 - 9,
                top: -43,
                width: 18,
                height: 18,
                borderRadius: 9,
                background: on > 0.5 ? color : palette.surface,
                border: `2px solid ${color}`,
                boxShadow: on > 0.5 ? `0 0 ${18 * on}px ${color}` : 'none',
              }}
            />
            <div style={{ fontSize: height * 0.04, fontWeight: 600, color: palette.text }}>{step.title}</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: height * 0.03, color: on > 0.5 ? color : palette.muted, marginTop: 8 }}>
              {step.detail}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
