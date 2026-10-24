import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './Card';

describe('FE-61 Card', () => {
  it('is a plain surface; with a title it becomes a labelled region', () => {
    render(
      <Card title="Connections" actions={<button type="button">Add</button>}>
        body
      </Card>,
    );
    const region = screen.getByRole('region', { name: 'Connections' });
    expect(region).toHaveAttribute('data-surface', 'panel');
    expect(region).toHaveTextContent('body');
  });
});
