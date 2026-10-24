import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Provisional mark: blue→green gradient ring with a dark core (docs/03-design.md, section 8). */
export function OrbitMark({ className = 'size-5' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full p-0.5 ${className}`}
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
  // The sanitizer loads only when there is a logo (wall budget); the name shows at once.
  const [logo, setLogo] = useState<{ svg: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!logoSvg) return;
    let current = true;
    void import('../branding/sanitizeSvg').then(({ sanitizeSvg, svgDataUrl }) => {
      const result = sanitizeSvg(logoSvg);
      if (current) setLogo({ svg: logoSvg, url: result.ok ? svgDataUrl(result.svg) : null });
    });
    return () => {
      current = false;
    };
  }, [logoSvg]);
  const logoUrl = logoSvg && logo?.svg === logoSvg ? logo.url : null;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <OrbitMark />
      <span className="display-wide text-lg">{t('app.name')}</span>
      <span aria-hidden className="h-5 w-px bg-line-2" />
      {logoUrl && (
        <img src={logoUrl} alt={t('branding.logoAlt', { name })} className="h-6 w-auto max-w-24 shrink-0 object-contain" />
      )}
      <span title={name} className="max-w-64 truncate text-md font-semibold">
        {name}
      </span>
    </div>
  );
}
