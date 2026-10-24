/**
 * Shared classes for the console form controls (FE-61 tokens). Prefer the TextInput / Select / Field
 * components; these strings remain for screens that render native controls directly.
 */
export const INPUT_CLASS =
  'h-9 w-full min-w-0 rounded-sm border border-line-2 bg-s2 px-2.5 text-base text-text placeholder:text-dim transition-colors duration-120 hover:border-dim focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-down pointer-coarse:h-11';

/** `select-chevron` (base.css) draws the arrow of a native select. */
export const SELECT_CLASS = `${INPUT_CLASS} select-chevron pr-8`;

export const TEXTAREA_CLASS =
  'min-h-20 w-full min-w-0 rounded-sm border border-line-2 bg-s2 px-2.5 py-2 text-base leading-normal text-text placeholder:text-dim transition-colors duration-120 hover:border-dim focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-down';

export const LABEL_CLASS = 'flex flex-col gap-1.5 text-sm font-medium text-muted';
