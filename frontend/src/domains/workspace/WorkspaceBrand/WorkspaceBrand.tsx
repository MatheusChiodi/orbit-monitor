import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { sanitizeSvg, svgDataUrl } from '../branding/sanitizeSvg';

/** Provisional mark: blue→green gradient ring with a dark core (docs/03-design.md, section 8). */
export function OrbitMark() {
  return (
    <span
      aria-hidden
      className="inline-block size-[1.3rem] shrink-0 rounded-full p-[0.22rem]"
      style={{ background: 'conic-gradient(from 200deg, var(--info), var(--ok), var(--info))' }}
    >
      <span className="block size-full rounded-full bg-bg" />
    </span>
  );
}

export interface WorkspaceBrandProps {
  /** Workspace name (`orbit.settings.json`). */
  name: string;
  /** Raw SVG markup; sanitized here and rendered only through `<img>`, never as live markup. */
  logoSvg?: string;
}

/** FE-10: Orbit mark and name, then the workspace logo and name. */
export function WorkspaceBrand({ name, logoSvg }: WorkspaceBrandProps) {
  const { t } = useTranslation();
  const logoUrl = useMemo(() => {
    if (!logoSvg) return null;
    const result = sanitizeSvg(logoSvg);
    return result.ok ? svgDataUrl(result.svg) : null;
  }, [logoSvg]);

  return (
    <div className="flex min-w-0 items-center gap-[0.55rem]">
      <OrbitMark />
      <span className="font-display text-[1.1rem] font-bold tracking-tight">{t('app.name')}</span>
      <span aria-hidden className="h-[1.2rem] w-px bg-line-2" />
      {logoUrl && (
        <img src={logoUrl} alt={t('branding.logoAlt', { name })} className="h-[1.4rem] w-auto max-w-[6rem] shrink-0 object-contain" />
      )}
      <span title={name} className="max-w-[16rem] truncate text-[0.95rem] font-semibold">
        {name}
      </span>
    </div>
  );
}
