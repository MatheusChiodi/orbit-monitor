import { useTranslation } from 'react-i18next';
import type { OrbitTheme } from '@/shared/theme';
import { themeStyle } from '../WallPreview';

/** Console sample: text levels, a field, a button and one SQL line with syntax colors. */
export function ConsolePreview({ theme, label }: { theme: OrbitTheme; label: string }) {
  const { t } = useTranslation();
  const s = (token: keyof OrbitTheme['syntax']) => ({ color: `var(--syntax-${token})` });
  return (
    <section role="region" aria-label={label} style={themeStyle(theme)} className="flex flex-col gap-3 rounded-[0.6rem] bg-bg p-4">
      <div className="rounded-[0.45rem] border border-line bg-s1 p-3">
        <p className="text-[0.9rem] font-semibold text-text">{t('theme.mini.hero')}</p>
        <p className="text-[0.78rem] text-muted">GET https://api.example.com/health · 30 s</p>
        <p className="text-[0.68rem] text-dim">p95 182 ms</p>
      </div>
      <pre className="overflow-x-auto rounded-[0.45rem] border border-line bg-s1 p-3 font-mono text-[0.78rem] leading-relaxed">
        <span style={s('comment')}>-- {t('theme.mini.matrix')}</span>
        {'\n'}
        <span style={s('keyword')}>SELECT</span> <span style={s('function')}>count</span>
        <span style={s('operator')}>(</span>
        <span style={s('operator')}>*</span>
        <span style={s('operator')}>)</span> <span style={s('keyword')}>FROM</span>{' '}
        <span style={s('identifier')}>orders</span> <span style={s('keyword')}>WHERE</span>{' '}
        <span style={s('identifier')}>status</span> <span style={s('operator')}>=</span>{' '}
        <span style={s('string')}>'failed'</span> <span style={s('keyword')}>LIMIT</span>{' '}
        <span style={s('number')}>200</span>
      </pre>
      <div className="flex items-center gap-2">
        <span className="h-[2rem] flex-1 rounded-[0.45rem] border border-line-2 bg-s2" />
        <span className="inline-flex h-[2rem] items-center rounded-[0.45rem] bg-[var(--accent)] px-3 text-[0.8rem] font-semibold text-bg">
          OK
        </span>
        <span className="inline-flex h-[2rem] items-center rounded-[0.45rem] border border-line-2 bg-s3 px-3 text-[0.8rem] text-text">
          …
        </span>
      </div>
    </section>
  );
}
