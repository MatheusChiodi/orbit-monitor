import { createIcon } from './createIcon';

/** Own module: the wall imports only this icon (CustomizeHandle), so the full set stays out of its bundle. */
export const IconSettings = /* @__PURE__ */ createIcon('settings', [
  'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  'M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
]);
