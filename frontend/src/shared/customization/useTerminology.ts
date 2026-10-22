import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { applyTerminology, createTerminologyStore, emptyTerminology, type TerminologyStore } from './terminology';

const fallbackStore = createTerminologyStore();

/** FE-54: keeps the i18next catalog in sync with `orbit.terminology.json`; originals come back on unmount. */
export function useTerminology(store: TerminologyStore | null): void {
  const { i18n } = useTranslation();
  const labels = useStore(store ?? fallbackStore, (s) => s.labels);
  useEffect(() => {
    applyTerminology(i18n, labels);
  }, [i18n, labels]);
  useEffect(() => () => applyTerminology(i18n, emptyTerminology()), [i18n]);
}
