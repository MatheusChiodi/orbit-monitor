import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import type { AccessInfo } from '@/shared/api/types';
import type { CustomizationStore } from '@/shared/customization/store';
import type { TerminologyStore } from '@/shared/customization/terminology';
import { useAppearance } from '@/shared/customization/useAppearance';
import { CustomizationRuntime } from '../CustomizationRuntime';
import { CustomizeModeProvider } from '../CustomizeModeProvider';

const WallCustomizeControls = lazy(() => import('./WallCustomizeControls'));

export interface WallCustomizationProps {
  store: CustomizationStore;
  terminology?: TerminologyStore | null;
  /** Wall layout slug: its layout-scoped values win over device and workspace ones. */
  layoutId?: string | null;
  /** FE-53: Customize mode is offered only when the API grants edit access. */
  getAccess?: () => Promise<AccessInfo>;
  children: ReactNode;
}

/** Wall entry: customization is read-only unless this device may edit; editor code is a separate chunk. */
export function WallCustomization({ store, terminology = null, layoutId = null, getAccess, children }: WallCustomizationProps) {
  useAppearance(store, layoutId);
  const [editable, setEditable] = useState(false);
  useEffect(() => {
    if (!getAccess) return;
    let alive = true;
    getAccess().then(
      (access) => alive && setEditable(access.mode === 'edit'),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [getAccess]);
  return (
    <CustomizationRuntime store={store} terminology={terminology} layoutId={layoutId}>
      <CustomizeModeProvider editable={editable}>
        {children}
        {editable && (
          <Suspense fallback={null}>
            <WallCustomizeControls />
          </Suspense>
        )}
      </CustomizeModeProvider>
    </CustomizationRuntime>
  );
}
