import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { EmptyState } from '../EmptyState/EmptyState';
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

  it('guides the first monitor with a step list', async () => {
    const onStart = vi.fn();
    render(<Onboarding resources={{ connections: [], selects: [], requests: [], layouts: [] }} mode="edit" onStart={onStart} />);
    expect(screen.getByRole('heading', { name: 'Create your first monitor' })).toBeInTheDocument();
    const steps = screen.getByRole('list', { name: 'Getting started' });
    expect(steps).toHaveTextContent('Add a database connection');
    expect(steps).toHaveTextContent('Create a monitor (URL or SELECT)');
    expect(steps).toHaveTextContent('Choose what the wall shows');
    await userEvent.click(screen.getByRole('button', { name: 'Monitor a URL' }));
    expect(onStart).toHaveBeenCalledWith('HTTP');
    await userEvent.click(screen.getByRole('button', { name: 'Monitor a SELECT' }));
    expect(onStart).toHaveBeenCalledWith('SQL');
  });

  it('completed steps are marked in text, not only by color', () => {
    render(<Onboarding resources={{ connections: [{ id: 'c' }], selects: [], requests: [], layouts: [] }} mode="edit" onStart={vi.fn()} />);
    expect(screen.getByRole('listitem', { name: /Add a database connection/ })).toHaveTextContent('Done');
  });

  it('view-only clients are told where setup happens', () => {
    render(<Onboarding resources={{ connections: [], selects: [], requests: [], layouts: [] }} mode="view-only" onStart={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Monitor a URL' })).toBeNull();
    expect(screen.getByText('Monitors are created on the machine running Orbit.')).toBeInTheDocument();
  });

  it('EmptyState: title, explanation and an optional action', async () => {
    const onAction = vi.fn();
    render(<EmptyState title="No connections yet" description="Connections are saved in orbit.connections.json." actionLabel="Add connection" onAction={onAction} />);
    expect(screen.getByRole('heading', { name: 'No connections yet' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add connection' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(
      <Onboarding resources={{ connections: [], selects: [], requests: [], layouts: [] }} mode="edit" onStart={vi.fn()} />,
      'pt-BR',
    );
    expect(screen.getByRole('heading', { name: 'Crie seu primeiro monitor' })).toBeInTheDocument();
  });
});
