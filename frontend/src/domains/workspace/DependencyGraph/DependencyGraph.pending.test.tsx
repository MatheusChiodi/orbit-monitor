import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { DependencyGraph, type GraphEdge, type GraphNode } from './DependencyGraph';
import { impactRadius, layoutGraph } from './graph';

const nodes: GraphNode[] = [
  { id: 'bus', label: 'Event bus', status: 'DOWN' },
  { id: 'auth', label: 'Authentication API', status: 'OK' },
  { id: 'portal', label: 'Web portal', status: 'OK' },
  { id: 'checkout', label: 'Checkout API', status: 'OK' },
  { id: 'dns', label: 'Internal DNS', status: 'OK' },
];
const edges: GraphEdge[] = [
  { from: 'bus', to: 'auth' },
  { from: 'auth', to: 'portal' },
  { from: 'auth', to: 'checkout' },
];

describe('FE-42 dependency graph', () => {
  describe('impactRadius (pure)', () => {
    it('collects everything downstream of a node', () => {
      expect([...impactRadius(edges, 'bus')].sort()).toEqual(['auth', 'checkout', 'portal']);
      expect([...impactRadius(edges, 'portal')]).toEqual([]);
    });
    it('survives cycles', () => {
      expect([...impactRadius([...edges, { from: 'portal', to: 'bus' }], 'bus')].sort()).toEqual(['auth', 'checkout', 'portal']);
    });
  });

  it('layoutGraph places upstream nodes in earlier columns', () => {
    const pos = layoutGraph(nodes, edges);
    expect(pos.get('bus')!.column).toBeLessThan(pos.get('auth')!.column);
    expect(pos.get('auth')!.column).toBeLessThan(pos.get('portal')!.column);
  });

  it('every node shows its state in text', () => {
    render(<DependencyGraph nodes={nodes} edges={edges} />);
    expect(screen.getByRole('button', { name: 'Event bus · DOWN' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Web portal · OK' })).toBeInTheDocument();
  });

  it('selecting a node highlights its impact radius and lists it', async () => {
    render(<DependencyGraph nodes={nodes} edges={edges} />);
    await userEvent.click(screen.getByRole('button', { name: 'Event bus · DOWN' }));
    expect(screen.getByRole('button', { name: 'Event bus · DOWN' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Web portal · OK' })).toHaveAttribute('data-impacted', 'true');
    expect(screen.getByRole('button', { name: 'Internal DNS · OK' })).toHaveAttribute('data-impacted', 'false');
    expect(screen.getByRole('status')).toHaveTextContent('Event bus impacts 3 monitors: Authentication API, Web portal, Checkout API');
  });

  it('is keyboard navigable (Tab to nodes, Enter selects, Escape clears)', async () => {
    render(<DependencyGraph nodes={nodes} edges={edges} />);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Event bus · DOWN' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('impacts 3 monitors');
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Event bus · DOWN' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('empty state when orbit.dependencies.json does not exist yet', () => {
    render(<DependencyGraph nodes={nodes} edges={[]} />);
    expect(screen.getByText('No dependencies yet. Link monitors to see the impact radius and suppress cascades.')).toBeInTheDocument();
  });

  it('renders in pt-BR', async () => {
    renderWithLocale(<DependencyGraph nodes={nodes} edges={edges} />, 'pt-BR');
    await userEvent.click(screen.getByRole('button', { name: 'Event bus · FORA' }));
    expect(screen.getByRole('status')).toHaveTextContent('Event bus impacta 3 monitores');
  });
});
