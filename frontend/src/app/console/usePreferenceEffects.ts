import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import type { OperatorStore } from '@/domains/security/operator';
import { setLocale } from '@/shared/i18n/i18n';
import { applyDensity } from '@/shared/preferences/density';
import type { Preferences, PreferencesStore } from '@/shared/preferences/preferences';

/**
 * FE-50: applies the device preferences to the console. Density is applied at once; language and
 * operator name follow later changes only, so the startup locale (`?lang=`, saved, browser) and the
 * declared operator are not overridden by built-in defaults.
 */
export function usePreferenceEffects(store: PreferencesStore, operatorStore: OperatorStore): Preferences {
  const { i18n } = useTranslation();
  const effective = useStore(store, (s) => s.effective);
  const previous = useRef(effective);

  useEffect(() => {
    applyDensity(effective.density);
  }, [effective.density]);

  useEffect(() => {
    const before = previous.current;
    previous.current = effective;
    if (before.locale !== effective.locale) void setLocale(i18n, effective.locale);
    if (before.operatorName !== effective.operatorName && effective.operatorName) {
      operatorStore.getState().setName(effective.operatorName);
    }
  }, [effective, i18n, operatorStore]);

  return effective;
}
