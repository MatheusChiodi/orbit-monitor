import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { TiledWall } from './TiledWall';

describe('FE-20 TiledWall', () => {
  it('renders the full wall canvas offset to the requested tile', () => {
    render(
      <TiledWall tile={{ index: 2, total: 2, columns: 2, rows: 1 }} canvas={{ width: 3840, height: 1080 }}>
        <p>wall</p>
      </TiledWall>,
    );
    const canvas = screen.getByTestId('tile-canvas');
    expect(canvas.style.width).toBe('3840px');
    expect(canvas.style.transform).toBe('translate(-1920px, 0px)');
  });

  it('without a tile renders the children as-is', () => {
    render(
      <TiledWall tile={null} canvas={{ width: 1920, height: 1080 }}>
        <p>wall</p>
      </TiledWall>,
    );
    expect(screen.queryByTestId('tile-canvas')).toBeNull();
    expect(screen.getByText('wall')).toBeInTheDocument();
  });

  it('labels the tile for screen readers in both languages', () => {
    const tile = { index: 3, total: 4, columns: 2, rows: 2 };
    const { unmount } = render(
      <TiledWall tile={tile} canvas={{ width: 3840, height: 2160 }}>
        <p>wall</p>
      </TiledWall>,
    );
    expect(screen.getByRole('region', { name: 'Tile 3 of 4' })).toBeInTheDocument();
    unmount();
    renderWithLocale(
      <TiledWall tile={tile} canvas={{ width: 3840, height: 2160 }}>
        <p>wall</p>
      </TiledWall>,
      'pt-BR',
    );
    expect(screen.getByRole('region', { name: 'Parte 3 de 4' })).toBeInTheDocument();
  });
});
