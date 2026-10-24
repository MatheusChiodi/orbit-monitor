import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../Button';
import { IconMonitor } from '../icons';
import { EmptyState } from './EmptyState';

describe('FE-61 EmptyState', () => {
  it('shows icon, title, body and one action', () => {
    render(
      <EmptyState icon={IconMonitor} title="Nothing in orbit yet" action={<Button variant="primary">Add monitor</Button>}>
        Watch a site or a database query.
      </EmptyState>,
    );
    expect(screen.getByRole('heading', { name: 'Nothing in orbit yet' })).toBeInTheDocument();
    expect(screen.getByText('Watch a site or a database query.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add monitor' })).toBeInTheDocument();
  });
});
