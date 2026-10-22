/** FE-55 card icon: a decorative glyph next to the title (the name stays the accessible label). */
const GLYPHS: Readonly<Record<string, string>> = { database: '⛁', globe: '◍', server: '▤', queue: '≡', payment: '¤' };

export function CardIcon({ icon }: { icon: string }) {
  const glyph = GLYPHS[icon];
  if (!glyph) return null;
  return (
    <span aria-hidden data-icon={icon} className="mr-[0.3rem] inline-block w-[1em] text-center text-muted">
      {glyph}
    </span>
  );
}
