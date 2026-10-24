import type { IconComponent, IconProps } from '@/shared/ui';

/** Section icons drawn like the `shared/ui` set (24-unit grid, stroke 1.5, currentColor); decorative. */
function navIcon(name: string, paths: readonly string[]): IconComponent {
  function Icon({ size = 16, className = '', ...rest }: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5 * (24 / size)}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        focusable="false"
        data-icon={name}
        className={`shrink-0 ${className}`}
        {...rest}
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    );
  }
  Icon.displayName = `NavIcon(${name})`;
  return Icon;
}

export const IconMaintenance = navIcon('maintenance', ['M4 6h16v14H4Z', 'M4 10h16', 'M8 3v4', 'M16 3v4', 'M9 15h6']);
export const IconReports = navIcon('reports', ['M5 20V11', 'M12 20V5', 'M19 20v-6']);
export const IconStatusPages = navIcon('status-pages', [
  'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  'M3.5 9h17',
  'M3.5 15h17',
  'M12 3c2.5 2.4 3.5 5.4 3.5 9s-1 6.6-3.5 9c-2.5-2.4-3.5-5.4-3.5-9s1-6.6 3.5-9Z',
]);
export const IconDependencies = navIcon('dependencies', [
  'M6 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  'M18 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  'M12 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  'M7 7.8 11 16.2',
  'M17 7.8 13 16.2',
]);
export const IconAudit = navIcon('audit', ['M9 3h6v3H9Z', 'M8 4.5H5V21h14V4.5h-3', 'M9 11h6', 'M9 15h4']);
