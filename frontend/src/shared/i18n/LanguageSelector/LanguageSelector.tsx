import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { SELECT_CLASS } from '@/shared/ui/formStyles';
import { SUPPORTED_LOCALES, currentLocale, isLocale, setLocale } from '../i18n';

export function LanguageSelector({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const id = useId();
  return (
    <span className={`inline-flex items-center gap-[0.4rem] ${className}`}>
      <label htmlFor={id} className="text-[0.8rem] text-muted">
        {t('app.language')}
      </label>
      <select
        id={id}
        className={`${SELECT_CLASS} w-auto`}
        value={currentLocale(i18n)}
        onChange={(e) => {
          if (isLocale(e.target.value)) void setLocale(i18n, e.target.value);
        }}
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {t(`app.languages.${locale}`)}
          </option>
        ))}
      </select>
    </span>
  );
}
