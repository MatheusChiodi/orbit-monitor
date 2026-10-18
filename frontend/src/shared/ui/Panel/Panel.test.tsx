import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Panel } from './Panel';

describe('Panel', () => {
  it('is a region labelled by its title', () => {
    render(<Panel title="Near threshold">content</Panel>);
    expect(screen.getByRole('region', { name: 'Near threshold' })).toHaveTextContent('content');
  });

  it('shows actions next to the title', () => {
    render(
      <Panel title="Timeline" actions={<span>live</span>}>
        x
      </Panel>,
    );
    expect(screen.getByText('live')).toBeInTheDocument();
  });

  it('renders children without a title', () => {
    render(<Panel>body only</Panel>);
    expect(screen.getByText('body only')).toBeInTheDocument();
  });

  it('marks the state tone for the side bar', () => {
    render(
      <Panel title="Situation" tone="DOWN">
        x
      </Panel>,
    );
    expect(screen.getByRole('region')).toHaveAttribute('data-tone', 'DOWN');
  });
});

describe('Panel pulse', () => {
  it('blinks the side bar when pulse is set', () => {
    const { container } = render(
      <Panel title="Situation" tone="DOWN" pulse>
        x
      </Panel>,
    );
    const bar = container.querySelector('[data-pulse="true"]');
    expect(bar).not.toBeNull();
    expect(bar?.className).toContain('anim-blink');
  });
});
