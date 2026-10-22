import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { WorkspaceBrand } from './WorkspaceBrand';

const logo = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';

describe('FE-10 workspace branding — header brand', () => {
  it('shows the workspace logo and name next to Orbit', () => {
    render(<WorkspaceBrand name="ACME Payments" logoSvg={logo} />);
    expect(screen.getByRole('img', { name: 'ACME Payments logo' })).toBeInTheDocument();
    expect(screen.getByText('ACME Payments')).toBeInTheDocument();
    expect(screen.getByText('Orbit')).toBeInTheDocument();
  });

  it('never renders a malicious logo as live markup', () => {
    const { container } = render(
      <WorkspaceBrand name="X" logoSvg={'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script></svg>'} />,
    );
    expect(container.innerHTML).not.toMatch(/<script|onload=/i);
  });

  it('falls back to the Orbit mark without a logo', () => {
    render(<WorkspaceBrand name="ACME" />);
    expect(screen.queryByRole('img', { name: 'ACME logo' })).toBeNull();
    expect(screen.getByText('ACME')).toBeInTheDocument();
  });

  it('truncates long names but keeps the full name accessible', () => {
    const long = 'A very long workspace name that would not fit in the header';
    render(<WorkspaceBrand name={long} />);
    expect(screen.getByTitle(long)).toBeInTheDocument();
  });

  it('logo alt text in pt-BR', () => {
    renderWithLocale(<WorkspaceBrand name="ACME" logoSvg={logo} />, 'pt-BR');
    expect(screen.getByRole('img', { name: 'Logo de ACME' })).toBeInTheDocument();
  });
});
