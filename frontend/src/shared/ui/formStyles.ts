/**
 * Shared classes for the console form controls (FE-61 tokens). Prefer the TextInput / Select / Field
 * components; these strings remain for screens that render native controls directly.
 */
export const INPUT_CLASS =
  'ui-control h-9 w-full min-w-0 rounded-sm border border-line-2 bg-s2 px-2.5 text-base text-text placeholder:text-dim focus:border-accent disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-down';

/** `select-chevron` (theme.css, console) draws the arrow of a native select; `ui-control` adds touch height. */
export const SELECT_CLASS = `${INPUT_CLASS} select-chevron pr-8`;

export const LABEL_CLASS = 'flex flex-col gap-1.5 text-sm font-medium text-muted';
