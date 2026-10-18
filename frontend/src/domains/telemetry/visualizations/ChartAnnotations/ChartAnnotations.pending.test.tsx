import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { ChartAnnotations } from './ChartAnnotations';

const range = { from: '2026-10-18T14:00:00Z', to: '2026-10-18T18:00:00Z' };
const annotations = [
  { id: 'i1', kind: 'incident' as const, at: new Date(2026, 9, 18, 17, 5).toISOString(), title: 'Reconciliation queue down' },
  { id: 'm1', kind: 'maintenance' as const, at: '2026-10-18T15:00:00Z', until: '2026-10-18T15:30:00Z', title: 'Core DB patch' },
  { id: 'd1', kind: 'deploy' as const, at: '2026-10-18T16:00:00Z', title: 'checkout v2.4.1' },
];

describe('FE-26 chart annotations', () => {
  it('renders one labelled marker per annotation, kind as text (not only color)', () => {
    render(<ChartAnnotations annotations={annotations} range={range} width={600} />);
    expect(screen.getByRole('button', { name: /Incident at 17:05/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Maintenance/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Deploy/ })).toBeInTheDocument();
  });

  it('maintenance windows are bands, incidents and deploys are lines', () => {
    const { container } = render(<ChartAnnotations annotations={annotations} range={range} width={600} />);
    expect(container.querySelectorAll('[data-annotation="band"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-annotation="line"]')).toHaveLength(2);
  });

  it('activating a marker shows its title and calls back', async () => {
    const onOpen = vi.fn();
    render(<ChartAnnotations annotations={annotations} range={range} width={600} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: /Incident at 17:05/ }));
    expect(screen.getByText('Reconciliation queue down')).toBeInTheDocument();
    expect(onOpen).toHaveBeenCalledWith('i1');
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<ChartAnnotations annotations={annotations} range={range} width={600} />, 'pt-BR');
    expect(screen.getByRole('button', { name: /Incidente às 17:05/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Manutenção/ })).toBeInTheDocument();
  });

  it('never shows a card number in an annotation (PCI DSS)', async () => {
    const pan = '4111 1111 1111 1111';
    const { container } = render(
      <ChartAnnotations
        annotations={[{ id: 'x', kind: 'incident', at: '2026-10-18T17:00:00Z', title: `Row ${pan}` }]}
        range={range}
        width={600}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Incident/ }));
    expect(container.innerHTML).not.toContain(pan);
    expect(container.textContent).toContain('•••• •••• •••• 1111');
  });

  it('renders nothing without annotations', () => {
    const { container } = render(<ChartAnnotations annotations={[]} range={range} width={600} />);
    expect(container.querySelectorAll('[data-annotation]')).toHaveLength(0);
  });
});
