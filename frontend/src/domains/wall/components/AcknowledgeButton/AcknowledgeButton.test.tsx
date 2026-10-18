import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Incident } from '@/shared/api/types';
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
  it('vermelho sólido quando o incidente é fora', async () => {
    const onAcknowledge = vi.fn();
    render(<AcknowledgeButton incident={base} onAcknowledge={onAcknowledge} />);
    const button = screen.getByRole('button', { name: 'Reconhecer' });
    expect(button).toHaveAttribute('data-variant', 'danger');
    await userEvent.click(button);
    expect(onAcknowledge).toHaveBeenCalledWith('i1');
  });

  it('neutro quando é atenção', () => {
    render(<AcknowledgeButton incident={{ ...base, severity: 'WARN' }} onAcknowledge={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Reconhecer' })).toHaveAttribute('data-variant', 'neutral');
  });

  it('depois de reconhecido vira texto', () => {
    const at = new Date(2026, 9, 18, 17, 4).toISOString();
    render(
      <AcknowledgeButton incident={{ ...base, acknowledgedBy: 'M. Chiodi', acknowledgedAt: at }} onAcknowledge={vi.fn()} />,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('M. Chiodi reconheceu às 17:04')).toBeInTheDocument();
  });
});
