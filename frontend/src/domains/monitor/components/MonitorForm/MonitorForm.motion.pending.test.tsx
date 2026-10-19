import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PreviewResult } from '@/shared/api/types';
import { entersAnimated, isStatic, renderWithMotion } from '@/test/motion';
import { MonitorForm } from './MonitorForm';

const preview: PreviewResult = { columns: [{ name: 'QTY', type: 'number' }], rows: [{ QTY: 347 }], elapsedMs: 120 };

function deferred() {
  let resolve: (value: PreviewResult) => void = () => {};
  const promise = new Promise<PreviewResult>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function form(onPreview: () => Promise<PreviewResult>) {
  return (
    <MonitorForm
      groups={[{ id: 'pay', name: 'Payments' }]}
      connections={[{ id: 'ora', name: 'Core Oracle', kind: 'ORACLE' }]}
      onPreview={onPreview}
      onSave={vi.fn().mockResolvedValue(undefined)}
      onCancel={vi.fn()}
    />
  );
}

async function fill() {
  await userEvent.selectOptions(screen.getByLabelText('Connection'), 'ora');
  fireEvent.change(screen.getByRole('textbox', { name: 'SQL query' }), { target: { value: 'SELECT COUNT(*) QTY FROM QUEUE' } });
}

describe('FE-51 MonitorForm motion', () => {
  it('standard: while the preview runs a shimmering skeleton is shown, then cross-fades to the table', async () => {
    const d = deferred();
    renderWithMotion(form(() => d.promise), 'standard');
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Run preview' }));
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(skeleton).toHaveAttribute('data-skeleton');
    expect(skeleton.className).toContain('anim-shimmer');
    d.resolve(preview);
    const table = await screen.findByRole('table', { name: 'Preview result' });
    expect(entersAnimated(table.closest('[data-motion-level]') as HTMLElement)).toBe(true);
  });

  it('off: skeleton without shimmer and a static table', async () => {
    const d = deferred();
    renderWithMotion(form(() => d.promise), 'off');
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Run preview' }));
    expect(screen.getByRole('status').className).not.toContain('anim-shimmer');
    d.resolve(preview);
    const table = await screen.findByRole('table', { name: 'Preview result' });
    expect(isStatic(table.closest('[data-motion-level]') as HTMLElement)).toBe(true);
  });

  it('the Data & display section expands into view', async () => {
    renderWithMotion(form(() => Promise.resolve(preview)), 'standard');
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Run preview' }));
    const section = await screen.findByRole('region', { name: 'Data & display' });
    expect(section).toHaveAttribute('data-motion', 'expand');
    expect(entersAnimated(section)).toBe(true);
  });

  it('prefers-reduced-motion forces off', async () => {
    renderWithMotion(form(() => Promise.resolve(preview)), 'expressive', 'en', { reducedMotion: true });
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Run preview' }));
    const section = await screen.findByRole('region', { name: 'Data & display' });
    expect(section).toHaveAttribute('data-motion-level', 'off');
    expect(isStatic(section)).toBe(true);
  });
});
