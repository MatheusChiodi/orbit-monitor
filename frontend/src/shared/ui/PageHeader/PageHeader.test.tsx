import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

describe('FE-61 PageHeader', () => {
  it('renders the page h1, description and actions', () => {
    render(<PageHeader title="Monitors" description="Everything Orbit watches" actions={<button type="button">Add monitor</button>} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Monitors' })).toBeInTheDocument();
    expect(screen.getByText('Everything Orbit watches')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add monitor' })).toBeInTheDocument();
  });
});
