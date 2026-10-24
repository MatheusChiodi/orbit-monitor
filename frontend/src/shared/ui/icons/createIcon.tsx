import type { SVGProps } from 'react';

/** FE-61 icon set: inline SVG, 24-unit grid drawn at 16 or 20 px, stroke 1.5, currentColor. */
export type IconSize = 16 | 20;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  size?: IconSize;
  /** Accessible name; without it the icon is decorative (aria-hidden). */
  title?: string;
}

export type IconComponent = (props: IconProps) => React.JSX.Element;

export function createIcon(name: string, paths: readonly string[]): IconComponent {
  function Icon({ size = 16, title, className = '', ...rest }: IconProps) {
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
        role={title ? 'img' : undefined}
        aria-label={title}
        aria-hidden={title ? undefined : true}
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
  Icon.displayName = `Icon(${name})`;
  return Icon;
}
