import { useEffect, useState, type ReactNode } from 'react';
import { CustomizationProvider, useCustomization } from '@/shared/customization/CustomizationProvider';
import { createCustomizeModeStore } from '@/shared/customization/customizeMode';

export interface CustomizeModeProviderProps {
  /** Only clients with edit access get Customize mode (docs/07 §7). */
  editable: boolean;
  children: ReactNode;
}

/** Adds the FE-53 Customize mode to the surrounding customization context. */
export function CustomizeModeProvider({ editable, children }: CustomizeModeProviderProps) {
  const { store, terminology, layoutId } = useCustomization();
  const [mode] = useState(() => createCustomizeModeStore(store, layoutId));
  useEffect(() => {
    if (!editable) mode.getState().toggle(false);
  }, [editable, mode]);
  return (
    <CustomizationProvider store={store} terminology={terminology} layoutId={layoutId} mode={editable ? mode : null}>
      {children}
    </CustomizationProvider>
  );
}
