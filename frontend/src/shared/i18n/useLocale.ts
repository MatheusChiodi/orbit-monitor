import { useTranslation } from 'react-i18next';
import { currentLocale, type Locale } from './i18n';

/** Active locale for the formatters (`Intl` and the time phrases). */
export function useLocale(): Locale {
  const { i18n } = useTranslation();
  return currentLocale(i18n);
}
