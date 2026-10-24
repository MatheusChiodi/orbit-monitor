/**
 * Wall-only glyphs in the FE-61 style (24-unit grid, stroke 1.5, currentColor). Sized in rem so they follow
 * the wall's viewing-distance scale; always decorative (the button carries the name).
 */
function glyph(name: string, paths: readonly string[]) {
  function Glyph({ className = 'size-4' }: { className?: string }) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        focusable="false"
        data-icon={name}
        className={`shrink-0 ${className}`}
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    );
  }
  Glyph.displayName = `Wall${name}`;
  return Glyph;
}

export const IconSoundOn = glyph('sound-on', ['M4 9.5h3.5L12 5v14l-4.5-4.5H4z', 'M15.5 9a4 4 0 0 1 0 6', 'M18 6.5a7.5 7.5 0 0 1 0 11']);
export const IconSoundOff = glyph('sound-off', ['M4 9.5h3.5L12 5v14l-4.5-4.5H4z', 'M16 9.5l5 5', 'M21 9.5l-5 5']);
export const IconFullscreen = glyph('fullscreen', ['M4 9V4h5', 'M15 4h5v5', 'M20 15v5h-5', 'M9 20H4v-5']);
