import type { TFunction } from 'i18next';
import type { Palette } from '../../../../remotion/palette';
import type { IntroId, IntroPropsMap } from '../../../../remotion/compositions/registry';

const FALLBACK: Palette = {
  bg: '#07090d',
  surface: '#0d1117',
  line: 'rgba(255,255,255,0.13)',
  text: '#eef2f7',
  muted: '#8b96a6',
  blue: '#3b9eff',
  green: '#22c55e',
  warn: '#f5a524',
  down: '#ff3b4f',
};

/** Live theme tokens, so custom themes recolor the intros (docs/03-design.md §4.2). */
export function readPalette(root: HTMLElement = document.documentElement): Palette {
  const style = getComputedStyle(root);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    bg: read('--bg', FALLBACK.bg),
    surface: read('--s1', FALLBACK.surface),
    line: read('--line-2', FALLBACK.line),
    text: read('--text', FALLBACK.text),
    muted: read('--muted', FALLBACK.muted),
    blue: read('--info', FALLBACK.blue),
    green: read('--ok', FALLBACK.green),
    warn: read('--warn', FALLBACK.warn),
    down: read('--down', FALLBACK.down),
  };
}

type Builders = { [K in IntroId]: (t: TFunction, palette: Palette) => IntroPropsMap[K] };

const builders: Builders = {
  'orbit-boot': (t, palette) => ({ title: t('app.name'), tagline: t('fx.boot.tagline'), palette }),
  'check-flow': (t, palette) => ({
    heading: t('fx.checkFlow.heading'),
    steps: [
      { title: t('fx.checkFlow.probe'), detail: t('fx.checkFlow.probeDetail'), tone: 'info' },
      { title: t('fx.checkFlow.reading'), detail: 'QTY = 349', tone: 'info' },
      { title: t('fx.checkFlow.rule'), detail: t('rule.text', { rule: 'QTY < 200' }), tone: 'warn' },
      { title: t('fx.checkFlow.state'), detail: t('status.label.DOWN'), tone: 'down' },
      { title: t('fx.checkFlow.wall'), detail: t('fx.checkFlow.wallDetail'), tone: 'ok' },
    ],
    palette,
  }),
  'first-monitor': (t, palette) => ({
    heading: t('fx.firstMonitor.heading'),
    steps: [t('fx.firstMonitor.paste'), t('fx.firstMonitor.fields'), t('fx.firstMonitor.rule'), t('fx.firstMonitor.wall')],
    query: 'SELECT COUNT(*) AS qty FROM reconciliation_queue',
    fields: ['qty · integer', 'checked_at · time'],
    rule: 'QTY < 200',
    wallLabel: t('fx.firstMonitor.example'),
    okLabel: t('status.label.OK'),
    palette,
  }),
};

/** Translated props for a composition: every visible word comes from the product i18n. */
export function introProps<K extends IntroId>(id: K, t: TFunction, palette: Palette): IntroPropsMap[K] {
  return builders[id](t, palette);
}
