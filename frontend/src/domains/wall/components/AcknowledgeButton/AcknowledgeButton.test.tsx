import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Incident } from '@/shared/api/types';
import { renderWithLocale } from '@/test/renderWithLocale';
import { AcknowledgeButton } from './AcknowledgeButton';

const base: Incident = {
  id: 'i1',
  monitorId: 'm1',
  severity: 'DOWN',
  openedAt: '2026-10-18T17:00:00.000Z',
  acknowledgedBy: null,
  acknowledgedAt: null,
  impact: [],
  escalatesAt: null,
};

describe('AcknowledgeButton', () => {
  it('the primary action, never the DOWN red (red means state, not a button)', async () => {
    const onAcknowledge = vi.fn();
    render(<AcknowledgeButton incident={base} onAcknowledge={onAcknowledge} />);
    const button = screen.getByRole('button', { name: 'Acknowledge' });
    expect(button).toHaveAttribute('data-variant', 'primary');
    await userEvent.click(button);
    expect(onAcknowledge).toHaveBeenCalledWith('i1');
  });

  it('primary for a warning too', () => {
    render(<AcknowledgeButton incident={{ ...base, severity: 'WARN' }} onAcknowledge={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toHaveAttribute('data-variant', 'primary');
  });

  it('becomes text once acknowledged', () => {
    const at = new Date(2026, 9, 18, 17, 4).toISOString();
    render(
      <AcknowledgeButton incident={{ ...base, acknowledgedBy: 'lan', acknowledgedAt: at }} onAcknowledge={vi.fn()} />,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Acknowledged at 17:04')).toBeInTheDocument();
    expect(screen.queryByText(/lan/)).toBeNull();
  });

  it('pt-BR: "Reconhecer" and "Reconhecido às 17:04"', () => {
    renderWithLocale(<AcknowledgeButton incident={base} onAcknowledge={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('button', { name: 'Reconhecer' })).toBeInTheDocument();
    const at = new Date(2026, 9, 18, 17, 4).toISOString();
    renderWithLocale(
      <AcknowledgeButton incident={{ ...base, acknowledgedBy: 'lan', acknowledgedAt: at }} onAcknowledge={vi.fn()} />,
      'pt-BR',
    );
    expect(screen.getByText('Reconhecido às 17:04')).toBeInTheDocument();
  });
});
