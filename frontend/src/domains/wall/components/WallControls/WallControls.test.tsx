import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WallControls } from './WallControls';

const sound = { muted: true, volume: 0.6, severities: { DOWN: true, WARN: false } };

describe('WallControls', () => {
  it('offers desktop notifications on a client that can edit', () => {
    render(<WallControls sound={sound} onSoundChange={vi.fn()} notifications />);
    expect(screen.getByRole('button', { name: /desktop notifications/ })).toBeInTheDocument();
  });

  it('a TV (view-only, LAN or kiosk) gets no notification button', () => {
    render(<WallControls sound={sound} onSoundChange={vi.fn()} notifications={false} />);
    expect(screen.queryByRole('button', { name: /desktop notifications/ })).toBeNull();
    expect(screen.getByRole('switch', { name: 'Sound alerts' })).toBeInTheDocument();
  });
});
