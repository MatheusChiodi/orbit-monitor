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
  it('solid red when the incident is down', async () => {
    const onAcknowledge = vi.fn();
    render(<AcknowledgeButton incident={base} onAcknowledge={onAcknowledge} />);
    const button = screen.getByRole('button', { name: 'Acknowledge' });
    expect(button).toHaveAttribute('data-variant', 'danger');
    await userEvent.click(button);
    expect(onAcknowledge).toHaveBeenCalledWith('i1');
  });

  it('neutral when it is a warning', () => {
    render(<AcknowledgeButton incident={{ ...base, severity: 'WARN' }} onAcknowledge={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toHaveAttribute('data-variant', 'neutral');
  });

  it('becomes text once acknowledged', () => {
    const at = new Date(2026, 9, 18, 17, 4).toISOString();
    render(
      <AcknowledgeButton incident={{ ...base, acknowledgedBy: 'M. Chiodi', acknowledgedAt: at }} onAcknowledge={vi.fn()} />,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('M. Chiodi acknowledged at 17:04')).toBeInTheDocument();
  });

  it('pt-BR: "Reconhecer" and "M. Chiodi reconheceu às 17:04"', () => {
    renderWithLocale(<AcknowledgeButton incident={base} onAcknowledge={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('button', { name: 'Reconhecer' })).toBeInTheDocument();
    const at = new Date(2026, 9, 18, 17, 4).toISOString();
    renderWithLocale(
      <AcknowledgeButton incident={{ ...base, acknowledgedBy: 'M. Chiodi', acknowledgedAt: at }} onAcknowledge={vi.fn()} />,
      'pt-BR',
    );
    expect(screen.getByText('M. Chiodi reconheceu às 17:04')).toBeInTheDocument();
  });
});
