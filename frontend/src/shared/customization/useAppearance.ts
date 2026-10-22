import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';
import { appearanceFrom, applyAppearance } from './appearance';
import type { CustomizationStore } from './store';
import './customization.css';

/** FE-56: applies the resolved typography, shape and density to `<html>`. */
export function useAppearance(store: CustomizationStore, layoutId: string | null = null): void {
  const state = useStore(store);
  const look = useMemo(() => appearanceFrom(state, layoutId), [state, layoutId]);
  const key = JSON.stringify(look);
  useEffect(() => {
    applyAppearance(JSON.parse(key) as typeof look);
  }, [key]);
}
