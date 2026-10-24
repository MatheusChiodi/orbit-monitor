import type { SVGProps } from 'react';

/** FE-61 icon set: inline SVG, 24-unit grid drawn at 16 or 20 px, stroke 1.5, currentColor. */
export type IconSize = 16 | 20;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  size?: IconSize;
  /** Accessible name; without it the icon is decorative (aria-hidden). */
  title?: string;
}

export type IconComponent = (props: IconProps) => React.JSX.Element;

function createIcon(name: string, paths: readonly string[]): IconComponent {
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

export const IconChevronDown = /* @__PURE__ */ createIcon('chevron-down', ['m6 9 6 6 6-6']);
export const IconChevronRight = /* @__PURE__ */ createIcon('chevron-right', ['m9 6 6 6-6 6']);
export const IconChevronLeft = /* @__PURE__ */ createIcon('chevron-left', ['m15 6-6 6 6 6']);
export const IconClose = /* @__PURE__ */ createIcon('close', ['M6 6l12 12', 'M18 6 6 18']);
export const IconCheck = /* @__PURE__ */ createIcon('check', ['m5 12.5 4.5 4.5L19 7.5']);
export const IconPlus = /* @__PURE__ */ createIcon('plus', ['M12 5v14', 'M5 12h14']);
export const IconMore = /* @__PURE__ */ createIcon('more', ['M5 12h.01', 'M12 12h.01', 'M19 12h.01']);
export const IconSearch = /* @__PURE__ */ createIcon('search', ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z', 'm20 20-4-4']);
export const IconBell = /* @__PURE__ */ createIcon('bell', ['M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15Z', 'M10 20.5a2 2 0 0 0 4 0']);
export const IconExternal = /* @__PURE__ */ createIcon('external', ['M14 4h6v6', 'M20 4 11 13', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5']);
export const IconAlert = /* @__PURE__ */ createIcon('alert', ['M12 4 2.5 20h19Z', 'M12 10v4', 'M12 17h.01']);
export const IconInfo = /* @__PURE__ */ createIcon('info', ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 11v5', 'M12 8h.01']);
export const IconSettings = /* @__PURE__ */ createIcon('settings', [
  'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  'M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
]);
export const IconUpload = /* @__PURE__ */ createIcon('upload', ['M12 15V4', 'm7 9 5-5 5 5', 'M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4']);
export const IconDownload = /* @__PURE__ */ createIcon('download', ['M12 4v11', 'm7 10 5 5 5-5', 'M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4']);
export const IconTrash = /* @__PURE__ */ createIcon('trash', ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 13h10l1-13', 'M9 7V4h6v3']);
export const IconEdit = /* @__PURE__ */ createIcon('edit', ['M4 20h4L19 9l-4-4L4 16Z', 'm13.5 6.5 4 4']);
export const IconPause = /* @__PURE__ */ createIcon('pause', ['M9 5v14', 'M15 5v14']);
export const IconPlay = /* @__PURE__ */ createIcon('play', ['M7 5v14l12-7Z']);
export const IconCopy = /* @__PURE__ */ createIcon('copy', ['M9 9h11v11H9Z', 'M5 15H4V4h11v1']);
export const IconMenu = /* @__PURE__ */ createIcon('menu', ['M4 7h16', 'M4 12h16', 'M4 17h16']);
export const IconArrowLeft = /* @__PURE__ */ createIcon('arrow-left', ['M19 12H5', 'm11 6-6 6 6 6']);
export const IconMonitor = /* @__PURE__ */ createIcon('monitor', ['M3 12h4l2-5 4 10 2-5h6']);
export const IconWall = /* @__PURE__ */ createIcon('wall', ['M3 5h18v12H3Z', 'M8 21h8', 'M12 17v4']);
export const IconFile = /* @__PURE__ */ createIcon('file', ['M6 3h8l4 4v14H6Z', 'M14 3v4h4']);
