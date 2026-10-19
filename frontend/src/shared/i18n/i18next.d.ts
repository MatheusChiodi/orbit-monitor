import 'i18next';
import type { Messages } from './i18n';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: Messages };
  }
}
