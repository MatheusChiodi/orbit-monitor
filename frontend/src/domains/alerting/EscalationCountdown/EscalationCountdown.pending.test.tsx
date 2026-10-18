import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { EscalationCountdown, formatCountdown } from './EscalationCountdown';

const now = new Date(2026, 9, 18, 17, 0, 0);
const inMs = (ms: number) => new Date(now.getTime() + ms).toISOString();

describe('FE-40 escalation countdown', () => {
  describe('formatCountdown (pure)', () => {
    it('mm:ss below one hour, h:mm:ss above', () => {
      expect(formatCountdown(492_000)).toBe('08:12');
      expect(formatCountdown(5_000)).toBe('00:05');
      expect(formatCountdown(3_723_000)).toBe('1:02:03');
    });
    it('never negative', () => {
      expect(formatCountdown(-1)).toBe('00:00');
    });
  });

  it('shows "Escalates in 08:12" and the next step', () => {
    render(<EscalationCountdown escalatesAt={inMs(492_000)} nextStep="Team lead" now={now} acknowledged={false} />);
    const timer = screen.getByRole('timer', { name: 'Escalation' });
    expect(timer).toHaveTextContent('Escalates in 08:12');
    expect(screen.getByText('next: Team lead')).toBeInTheDocument();
  });

  it('turns amber in the last minute (with text, not only color)', () => {
    render(<EscalationCountdown escalatesAt={inMs(30_000)} nextStep="Team lead" now={now} acknowledged={false} />);
    expect(screen.getByRole('timer')).toHaveAttribute('data-urgent', 'true');
  });

  it('after the deadline says it escalated', () => {
    render(<EscalationCountdown escalatesAt={inMs(-1000)} nextStep="Team lead" now={now} acknowledged={false} />);
    expect(screen.getByRole('timer')).toHaveTextContent('Escalated to Team lead');
  });

  it('acknowledged or without a policy shows nothing', () => {
    const { container, rerender } = render(<EscalationCountdown escalatesAt={inMs(60_000)} nextStep="X" now={now} acknowledged />);
    expect(container).toBeEmptyDOMElement();
    rerender(<EscalationCountdown escalatesAt={null} nextStep={null} now={now} acknowledged={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not announce every second to screen readers', () => {
    render(<EscalationCountdown escalatesAt={inMs(492_000)} nextStep="Team lead" now={now} acknowledged={false} />);
    expect(screen.getByRole('timer')).toHaveAttribute('aria-live', 'off');
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<EscalationCountdown escalatesAt={inMs(492_000)} nextStep="Gestor" now={now} acknowledged={false} />, 'pt-BR');
    expect(screen.getByRole('timer', { name: 'Escalonamento' })).toHaveTextContent('Escalona em 08:12');
  });
});
