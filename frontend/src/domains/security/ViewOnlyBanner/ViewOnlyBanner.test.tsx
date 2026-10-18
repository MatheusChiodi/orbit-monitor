import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { ViewOnlyBanner } from './ViewOnlyBanner';

describe('ViewOnlyBanner', () => {
  it('explains view-only mode in English', () => {
    render(<ViewOnlyBanner mode="view-only" />);
    expect(screen.getByRole('status')).toHaveTextContent('View-only: edits are allowed only on the machine running Orbit');
  });

  it('explains view-only mode in pt-BR', () => {
    renderWithLocale(<ViewOnlyBanner mode="view-only" />, 'pt-BR');
    expect(screen.getByRole('status')).toHaveTextContent('Somente leitura: edições só na máquina onde o Orbit roda');
  });

  it('renders nothing in edit mode', () => {
    const { container } = render(<ViewOnlyBanner mode="edit" />);
    expect(container).toBeEmptyDOMElement();
  });
});
