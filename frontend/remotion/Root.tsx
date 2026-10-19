import { Composition, Folder } from 'remotion';
import { FPS, HEIGHT, INTROS, WIDTH } from './compositions/registry';

/** Remotion Studio / CLI entry: the same compositions the console embeds with @remotion/player. */
export function RemotionRoot() {
  const { 'orbit-boot': boot, 'check-flow': flow, 'first-monitor': first } = INTROS;
  return (
    <Folder name="Orbit">
      <Composition id={boot.id} component={boot.component} durationInFrames={boot.durationInFrames} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={boot.defaultProps} />
      <Composition id={flow.id} component={flow.component} durationInFrames={flow.durationInFrames} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={flow.defaultProps} />
      <Composition id={first.id} component={first.component} durationInFrames={first.durationInFrames} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={first.defaultProps} />
    </Folder>
  );
}
