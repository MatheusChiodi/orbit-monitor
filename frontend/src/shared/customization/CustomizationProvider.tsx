import { createContext, useContext, type ReactNode } from 'react';
import type { CustomizeModeStore } from './customizeMode';
import { createCustomizationStore, type CustomizationStore } from './store';
import type { TerminologyStore } from './terminology';

export interface CustomizationContextValue {
  store: CustomizationStore;
  /** FE-54 labels; absent where names cannot be edited (wall). */
  terminology: TerminologyStore | null;
  /** Wall layout being shown (layout scope); `null` in the console. */
  layoutId: string | null;
  /** FE-53 Customize mode; only created for clients with edit access. */
  mode: CustomizeModeStore | null;
}

/** Without a provider every setting resolves to its product default (no storage is read). */
const fallback: CustomizationContextValue = { store: createCustomizationStore({ storage: false }), terminology: null, layoutId: null, mode: null };
const CustomizationContext = createContext<CustomizationContextValue>(fallback);

export interface CustomizationProviderProps {
  store: CustomizationStore;
  terminology?: TerminologyStore | null;
  layoutId?: string | null;
  mode?: CustomizeModeStore | null;
  children: ReactNode;
}

export function CustomizationProvider({ store, terminology = null, layoutId = null, mode = null, children }: CustomizationProviderProps) {
  return <CustomizationContext.Provider value={{ store, terminology, layoutId, mode }}>{children}</CustomizationContext.Provider>;
}

export function useCustomization(): CustomizationContextValue {
  return useContext(CustomizationContext);
}
