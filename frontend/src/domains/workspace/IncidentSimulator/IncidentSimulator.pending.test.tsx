import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '@/domains/wall/mock';
import { renderWithLocale } from '@/test/renderWithLocale';
import { IncidentSimulator } from './IncidentSimulator';

const now = new Date(2026, 9, 18, 17, 10, 0);

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('FE-17 incident simulator', () => {
  it('"What if" picks a monitor and a severity and previews the wall', async () => {
    render(<IncidentSimulator snapshot={mockSnapshot('ok', now)} now={now} />);
    expect(screen.getByRole('heading', { name: 'All systems operational' })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Monitor' }), 'checkout');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Severity' }), 'DOWN');
    await userEvent.click(screen.getByRole('button', { name: 'Simulate incident' }));
    expect(screen.getByRole('heading', { name: 'Checkout API' })).toBeInTheDocument();
  });

  it('the preview is clearly labelled as a simulation and never sends anything', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<IncidentSimulator snapshot={mockSnapshot('ok', now)} now={now} />);
    await userEvent.click(screen.getByRole('button', { name: 'Simulate incident' }));
    expect(screen.getByText('Simulation: nothing is real and no alert is sent')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('Acknowledge inside the simulation does not call the API', async () => {
    const onAcknowledge = vi.fn();
    render(<IncidentSimulator snapshot={mockSnapshot('ok', now)} now={now} onAcknowledge={onAcknowledge} />);
    await userEvent.click(screen.getByRole('button', { name: 'Simulate incident' }));
    await userEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(onAcknowledge).not.toHaveBeenCalled();
  });

  it('Reset returns to the real state', async () => {
    render(<IncidentSimulator snapshot={mockSnapshot('ok', now)} now={now} />);
    await userEvent.click(screen.getByRole('button', { name: 'Simulate incident' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('heading', { name: 'All systems operational' })).toBeInTheDocument();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<IncidentSimulator snapshot={mockSnapshot('ok', now)} now={now} />, 'pt-BR');
    expect(screen.getByRole('button', { name: 'Simular incidente' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Gravidade' })).toBeInTheDocument();
  });
});
