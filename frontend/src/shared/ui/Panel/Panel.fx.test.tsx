import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Panel } from './Panel';

describe('FE-52 Panel surface', () => {
  it('is a glass surface by default (the CSS only applies from the standard FX level)', () => {
    render(<Panel title="Near threshold">body</Panel>);
    expect(screen.getByRole('region', { name: 'Near threshold' })).toHaveClass('fx-glass');
  });

  it('surface="solid" opts out', () => {
    render(
      <Panel title="Near threshold" surface="solid">
        body
      </Panel>,
    );
    expect(screen.getByRole('region', { name: 'Near threshold' })).not.toHaveClass('fx-glass');
  });
});
