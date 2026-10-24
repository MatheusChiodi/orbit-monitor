import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { Onboarding } from './Onboarding';
import { onboardingSteps } from './onboardingSteps';

describe('FE-37 onboarding', () => {
  describe('onboardingSteps (pure)', () => {
    it('derives progress from the config resources (missing file = empty list)', () => {
      expect(onboardingSteps({ connections: [], selects: [], requests: [], layouts: [] })).toEqual([
        { id: 'connection', done: false },
        { id: 'monitor', done: false },
        { id: 'layout', done: false },
      ]);
      const steps = onboardingSteps({ connections: [{ id: 'c' }], selects: [], requests: [{ id: 'r' }], layouts: [] });
      expect(steps.map((s) => s.done)).toEqual([true, true, false]);
    });
  });

  it('is the empty state of the monitor list: one title and two ways to start', async () => {
    const onStart = vi.fn();
    render(<Onboarding mode="edit" onStart={onStart} />);
    expect(screen.getByRole('heading', { name: 'Nothing in orbit yet' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Monitor a URL/ }));
    expect(onStart).toHaveBeenCalledWith('HTTP');
    await userEvent.click(screen.getByRole('button', { name: /Monitor a SELECT/ }));
    expect(onStart).toHaveBeenCalledWith('SQL');
  });

  it('each way to start says what it does', () => {
    render(<Onboarding mode="edit" onStart={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Monitor a URL/ })).toHaveAccessibleDescription(/website or API/);
  });

  it('view-only clients are told where setup happens', () => {
    render(<Onboarding mode="view-only" onStart={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Monitor a URL/ })).toBeNull();
    expect(screen.getByText(/Monitors are added on the machine that runs Orbit/)).toBeInTheDocument();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<Onboarding mode="edit" onStart={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('heading', { name: 'Nada em órbita ainda' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Monitorar uma URL/ })).toBeInTheDocument();
  });
});
