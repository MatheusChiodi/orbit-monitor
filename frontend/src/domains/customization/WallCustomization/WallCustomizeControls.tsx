import { CustomizeLayer } from '../CustomizeLayer';
import { CustomizeToggle } from '../CustomizeToggle';

/** Editor half of Customize mode on the wall, loaded only for clients with edit access. */
export default function WallCustomizeControls() {
  return (
    <>
      <div className="fixed left-[1rem] bottom-[1rem] z-30">
        <CustomizeToggle className="bg-s1/90" />
      </div>
      <CustomizeLayer />
    </>
  );
}
