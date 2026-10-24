import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '@/domains/wall/mock';
import { renderWithLocale } from '@/test/renderWithLocale';
import { StatusPageBuilder, type StatusPageDraft } from './StatusPageBuilder';
import { statusPageUrl, toStatusPageItem } from './statusPage';

const snap = mockSnapshot('incident', new Date(2026, 9, 18, 17, 10, 0));

function setup(pages: StatusPageDraft[] = [], mode: 'edit' | 'view-only' = 'edit') {
  const onSave = vi.fn();
  render(<StatusPageBuilder groups={snap.groups} monitors={snap.monitors} pages={pages} mode={mode} onSave={onSave} />);
  return { onSave };
}

describe('FE-44 status page builder', () => {
  it('toStatusPageItem builds an orbit.status-pages.json item without probe data', () => {
    const item = toStatusPageItem({ title: 'Payments status', slug: 'payments', visibility: 'internal', groupIds: ['pay'] });
    expect(item).toEqual({ title: 'Payments status', slug: 'payments', visibility: 'internal', groupIds: ['pay'] });
  });

  it('picks groups and previews the page with group states in text', async () => {
    setup();
    await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), 'Payments status');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Payments' }));
    const preview = screen.getByRole('region', { name: 'Preview' });
    expect(within(preview).getByRole('heading', { name: 'Payments status' })).toBeInTheDocument();
    expect(within(preview).getByText('Payments')).toBeInTheDocument();
    expect(within(preview).getByText('Down')).toBeInTheDocument();
  });

  it('the preview shows states only: no values, rules or personal data', async () => {
    setup();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Payments' }));
    const preview = screen.getByRole('region', { name: 'Preview' });
    expect(preview).not.toHaveTextContent('349');
    expect(preview).not.toHaveTextContent('rule');
  });

  it('public vs internal is a labelled choice with a warning for public pages', async () => {
    setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Public' }));
    expect(screen.getByText('Anyone with the link can see this page. Only group states are shown.')).toBeInTheDocument();
  });

  it('the address is derived from the title and previewed as a full URL', async () => {
    setup();
    await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), 'Payments & Cards');
    expect(screen.getByRole('textbox', { name: 'Address' })).toHaveValue('payments-cards');
    expect(screen.getByText(`Full address: ${window.location.origin}/api/status/payments-cards`)).toBeInTheDocument();
  });

  it('statusPageUrl builds the full address of a page', () => {
    expect(statusPageUrl('payments', 'http://orbit.local:8080')).toBe('http://orbit.local:8080/api/status/payments');
  });

  it('internal and public are explained', async () => {
    setup();
    expect(screen.getByText(/Only people who can edit Orbit/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Public' }));
    expect(screen.queryByText(/Only people who can edit Orbit/)).toBeNull();
  });

  it('"All groups" selects and clears every group', async () => {
    setup();
    await userEvent.click(screen.getByRole('checkbox', { name: 'All groups' }));
    for (const g of snap.groups) expect(screen.getByRole('checkbox', { name: g.name })).toBeChecked();
    await userEvent.click(screen.getByRole('checkbox', { name: 'All groups' }));
    for (const g of snap.groups) expect(screen.getByRole('checkbox', { name: g.name })).not.toBeChecked();
  });

  it('the preview is never blank', () => {
    setup();
    const preview = screen.getByRole('region', { name: 'Preview' });
    expect(within(preview).getByRole('heading', { name: 'Untitled page' })).toBeInTheDocument();
    expect(within(preview).getByText('Choose groups to see how the page looks.')).toBeInTheDocument();
  });

  it('each saved page links to its address', () => {
    setup([{ title: 'Payments status', slug: 'payments-status', visibility: 'public', groupIds: ['pay'] }]);
    expect(screen.getByRole('link', { name: /Open page/ })).toHaveAttribute('href', `${window.location.origin}/api/status/payments-status`);
  });

  it('saves the page', async () => {
    const { onSave } = setup();
    await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), 'Payments status');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Payments' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save status page' }));
    expect(onSave).toHaveBeenCalledWith({ title: 'Payments status', slug: 'payments-status', visibility: 'internal', groupIds: ['pay'] });
  });

  it('cannot save without at least one group', async () => {
    const { onSave } = setup();
    await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), 'Empty');
    await userEvent.click(screen.getByRole('button', { name: 'Save status page' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose at least one group');
  });

  it('empty state when orbit.status-pages.json does not exist yet', () => {
    setup([]);
    expect(screen.getByText('No status pages yet.')).toBeInTheDocument();
  });

  it('view-only lists pages but cannot edit', () => {
    setup([{ title: 'Payments status', slug: 'payments-status', visibility: 'internal', groupIds: ['pay'] }], 'view-only');
    expect(screen.getByText('Payments status')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save status page' })).toBeNull();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<StatusPageBuilder groups={snap.groups} monitors={snap.monitors} pages={[]} mode="edit" onSave={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('button', { name: 'Salvar página de status' })).toBeInTheDocument();
    expect(screen.getByText('Nenhuma página de status ainda.')).toBeInTheDocument();
  });
});
