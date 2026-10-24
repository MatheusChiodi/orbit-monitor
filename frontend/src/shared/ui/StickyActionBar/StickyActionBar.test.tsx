import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StickyActionBar } from './StickyActionBar';

describe('FE-61 StickyActionBar', () => {
  it('is a sticky footer with a status line and actions', () => {
    render(
      <StickyActionBar status="Unsaved changes">
        <button type="button">Save changes</button>
      </StickyActionBar>,
    );
    const bar = screen.getByRole('button', { name: 'Save changes' }).closest('[data-sticky-action-bar]')!;
    expect(bar).toHaveClass('sticky');
    expect(bar).toHaveTextContent('Unsaved changes');
  });

  it('publishes its height for toasts while mounted and clears it after', () => {
    const { unmount } = render(
      <StickyActionBar>
        <button type="button">Save</button>
      </StickyActionBar>,
    );
    expect(document.documentElement.style.getPropertyValue('--sticky-bar-height')).toMatch(/px$/);
    unmount();
    expect(document.documentElement.style.getPropertyValue('--sticky-bar-height')).toBe('');
  });
});
