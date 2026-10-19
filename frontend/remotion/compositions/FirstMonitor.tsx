import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { DEFAULT_PALETTE, EASE_OUT, FONT_DISPLAY, FONT_MONO, FONT_SANS, type Palette } from '../palette';

export type FirstMonitorProps = {
  heading: string;
  /** Four steps: paste a target, fields found, pick a rule, on the wall. */
  steps: [string, string, string, string];
  query: string;
  fields: string[];
  rule: string;
  wallLabel: string;
  okLabel: string;
  palette: Palette;
};

export const FIRST_MONITOR_DEFAULTS: FirstMonitorProps = {
  heading: 'Your first monitor',
  steps: ['Paste a URL or a SELECT', 'Orbit finds the fields', 'Turn a field into a rule', 'It shows up on the wall'],
  query: 'SELECT COUNT(*) AS qty FROM reconciliation_queue',
  fields: ['qty · integer', 'checked_at · time'],
  rule: 'QTY < 200',
  wallLabel: 'Reconciliation queue',
  okLabel: 'OK',
  palette: DEFAULT_PALETTE,
};

const ease = Easing.bezier(...EASE_OUT);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const STEP_SECONDS = 1.6;

/** Which step is active, how far into it we are (0..1) and how many query characters are typed. */
export function firstMonitorTimeline(frame: number, fps: number, queryLength: number) {
  const stepFrames = STEP_SECONDS * fps;
  const raw = frame / stepFrames;
  const active = Math.min(3, Math.floor(raw));
  const progress = Math.min(1, raw - active);
  const typed = Math.round(interpolate(frame, [fps * 0.2, stepFrames * 0.85], [0, queryLength], clamp));
  return { active, progress, typed };
}

export function FirstMonitor({ heading, steps, query, fields, rule, wallLabel, okLabel, palette }: FirstMonitorProps) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { active, progress, typed } = firstMonitorTimeline(frame, fps, query.length);
  const appear = (step: number) => (active > step ? 1 : active === step ? interpolate(progress, [0, 0.35], [0, 1], { ...clamp, easing: ease }) : 0);
  const card = { background: palette.surface, border: `1px solid ${palette.line}`, borderRadius: 14, padding: '18px 22px' };
  const fontSize = height * 0.03;

  return (
    <AbsoluteFill style={{ background: palette.bg, fontFamily: FONT_SANS, color: palette.text, padding: `${height * 0.1}px ${width * 0.08}px` }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: height * 0.06, marginBottom: height * 0.05 }}>{heading}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.4fr', gap: width * 0.04, alignItems: 'start' }}>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: height * 0.03 }}>
          {steps.map((label, i) => (
            <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize, opacity: i <= active ? 1 : 0.35 }}>
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FONT_MONO,
                  fontSize: fontSize * 0.8,
                  background: i < active ? palette.green : 'transparent',
                  border: `2px solid ${i <= active ? palette.blue : palette.line}`,
                  color: i < active ? palette.bg : palette.text,
                }}
              >
                {i + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ ...card, fontFamily: FONT_MONO, fontSize, minHeight: fontSize * 1.6 }}>
            {query.slice(0, typed)}
            <span style={{ opacity: Math.floor(frame / (fps / 2)) % 2 ? 0 : 1, color: palette.blue }}>▍</span>
          </div>
          <div style={{ display: 'flex', gap: 10, opacity: appear(1), transform: `translateY(${6 * (1 - appear(1))}px)` }}>
            {fields.map((field) => (
              <span key={field} style={{ ...card, padding: '8px 14px', fontFamily: FONT_MONO, fontSize: fontSize * 0.85, color: palette.blue }}>
                {field}
              </span>
            ))}
          </div>
          <div style={{ ...card, fontFamily: FONT_MONO, fontSize, opacity: appear(2), color: palette.warn }}>{rule}</div>
          <div
            style={{
              ...card,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              opacity: appear(3),
              borderColor: palette.green,
              transform: `translateY(${6 * (1 - appear(3))}px)`,
            }}
          >
            <span style={{ width: 12, height: 12, borderRadius: 6, background: palette.green }} />
            <span style={{ fontWeight: 600, fontSize }}>{wallLabel}</span>
            <span style={{ marginLeft: 'auto', fontFamily: FONT_MONO, fontSize: fontSize * 0.9, color: palette.green }}>{okLabel}</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
