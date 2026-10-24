import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from '@/shared/ui';
import { SETTINGS_SECTIONS, isSettingsSection, settingsHref, type SettingsSection } from '../sections';

export interface SettingsNavProps {
  current: SettingsSection;
  /** Sections without a screen yet are listed but disabled. */
  unavailable?: readonly SettingsSection[];
  /** Hash navigation; defaults to setting `location.hash`. */
  onNavigate?: (section: SettingsSection) => void;
}

function go(section: SettingsSection) {
  window.location.hash = settingsHref(section);
}

/** FE-72 sub-nav: a vertical list from 1024 px, a section select below. */
export function SettingsNav({ current, unavailable = [], onNavigate = go }: SettingsNavProps) {
  const { t } = useTranslation();
  const selectId = useId();
  return (
    <>
      <div className="flex flex-col gap-1 lg:hidden">
        <label htmlFor={selectId} className="text-sm text-muted">
          {t('settingsHub.nav.jump')}
        </label>
        <Select
          id={selectId}
          value={current}
          onChange={(e) => {
            if (isSettingsSection(e.target.value)) onNavigate(e.target.value);
          }}
        >
          {SETTINGS_SECTIONS.map((section) => (
            <option key={section} value={section} disabled={unavailable.includes(section)}>
              {t(`settingsHub.nav.${section}`)}
            </option>
          ))}
        </Select>
      </div>
      <nav aria-label={t('settingsHub.nav.label')} className="hidden lg:block">
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {SETTINGS_SECTIONS.map((section) => {
            const active = section === current;
            return (
              <li key={section}>
                <a
                  href={settingsHref(section)}
                  aria-current={active ? 'page' : undefined}
                  aria-disabled={unavailable.includes(section) || undefined}
                  className={`flex flex-col gap-0.5 rounded-sm px-3 py-2 no-underline transition-colors duration-120 ${
                    active ? 'bg-s3 text-text' : 'text-muted hover:bg-s2 hover:text-text'
                  }`}
                >
                  <span className="text-base font-medium">{t(`settingsHub.nav.${section}`)}</span>
                  <span className="text-xs text-dim">{t(`settingsHub.navHint.${section}`)}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
