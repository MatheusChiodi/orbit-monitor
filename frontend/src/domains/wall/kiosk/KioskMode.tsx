import { useEffect } from 'react';
import { useKiosk } from './kiosk';

/** FE-45: enters kiosk mode (fullscreen, wake lock, hidden idle cursor) while mounted. */
export default function KioskMode() {
  const { enter } = useKiosk();
  useEffect(() => {
    void enter();
  }, [enter]);
  return null;
}
