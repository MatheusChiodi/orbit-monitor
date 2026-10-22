import { useEffect, type ReactNode } from 'react';
import { CustomizationProvider } from '@/shared/customization/CustomizationProvider';
import type { CustomizationStore } from '@/shared/customization/store';
import type { TerminologyStore } from '@/shared/customization/terminology';
import { useTerminology } from '@/shared/customization/useTerminology';

export interface CustomizationRuntimeProps {
  store: CustomizationStore;
  terminology?: TerminologyStore | null;
  layoutId?: string | null;
  children: ReactNode;
}

/** Loads `orbit.customization.json` and `orbit.terminology.json`, applies renamed labels and provides `useSetting`. */
export function CustomizationRuntime({ store, terminology = null, layoutId = null, children }: CustomizationRuntimeProps) {
  useEffect(() => {
    void store.getState().load();
    void terminology?.getState().load();
  }, [store, terminology]);
  useTerminology(terminology);
  return (
    <CustomizationProvider store={store} terminology={terminology} layoutId={layoutId}>
      {children}
    </CustomizationProvider>
  );
}
