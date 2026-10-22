import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { tileViewport, type Size, type Tile } from '../tiling';

export interface TiledWallProps {
  tile: Tile | null;
  /** Size of the whole video wall, in CSS pixels. */
  canvas: Size;
  children: ReactNode;
}

/** Renders the full wall canvas shifted so only this screen's tile is visible. */
export function TiledWall({ tile, canvas, children }: TiledWallProps) {
  const { t } = useTranslation();
  if (!tile) return <>{children}</>;
  const view = tileViewport(tile, canvas);
  return (
    <section
      aria-label={t('layout.tile', { index: tile.index, total: tile.total })}
      className="relative overflow-hidden"
      style={{ width: `${view.width}px`, height: `${view.height}px` }}
    >
      <div
        data-testid="tile-canvas"
        style={
          {
            width: `${canvas.width}px`,
            height: `${canvas.height}px`,
            transform: `translate(${-view.x}px, ${-view.y}px)`,
            // The wall fills the whole canvas instead of one screen (theme.css `.wall-root`).
            '--wall-canvas-height': `${canvas.height}px`,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </section>
  );
}
