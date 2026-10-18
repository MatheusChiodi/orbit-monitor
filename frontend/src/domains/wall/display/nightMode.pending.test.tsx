import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { NightModeOverlay, isNightTime, parseSchedule } from './nightMode';

const schedule = { enabled: true, from: '22:00', to: '06:00', dimTo: 0.6 };

describe('FE-09 night mode schedule', () => {
  it('detects night time across midnight', () => {
    expect(isNightTime(schedule, new Date(2026, 9, 18, 23, 0))).toBe(true);
    expect(isNightTime(schedule, new Date(2026, 9, 19, 5, 59))).toBe(true);
    expect(isNightTime(schedule, new Date(2026, 9, 19, 6, 0))).toBe(false);
    expect(isNightTime(schedule, new Date(2026, 9, 18, 12, 0))).toBe(false);
  });

  it('works for same-day windows and when disabled', () => {
    const day = { enabled: true, from: '12:00', to: '13:00', dimTo: 0.5 };
    expect(isNightTime(day, new Date(2026, 9, 18, 12, 30))).toBe(true);
    expect(isNightTime({ ...schedule, enabled: false }, new Date(2026, 9, 18, 23, 0))).toBe(false);
  });

  it('parses HH:MM and rejects invalid hours', () => {
    expect(parseSchedule({ from: '22:00', to: '06:00' })).toMatchObject({ from: '22:00', to: '06:00' });
    expect(parseSchedule({ from: '25:00', to: '06:00' })).toBeNull();
  });

  it('dims the wall without hiding it and announces the mode', () => {
    render(<NightModeOverlay schedule={schedule} now={new Date(2026, 9, 18, 23, 0)} />);
    const overlay = screen.getByTestId('night-mode');
    expect(Number(overlay.style.opacity)).toBeCloseTo(0.4);
    expect(overlay).toHaveStyle({ pointerEvents: 'none' });
    expect(screen.getByText('Night mode')).toBeInTheDocument();
  });

  it('an unacknowledged DOWN incident lifts the dimming (exceptions first)', () => {
    render(<NightModeOverlay schedule={schedule} now={new Date(2026, 9, 18, 23, 0)} hasUnownedIncident />);
    expect(screen.queryByTestId('night-mode')).toBeNull();
  });

  it('renders nothing during the day', () => {
    const { container } = render(<NightModeOverlay schedule={schedule} now={new Date(2026, 9, 18, 12, 0)} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('label in pt-BR', () => {
    renderWithLocale(<NightModeOverlay schedule={schedule} now={new Date(2026, 9, 18, 23, 0)} />, 'pt-BR');
    expect(screen.getByText('Modo noturno')).toBeInTheDocument();
  });
});
