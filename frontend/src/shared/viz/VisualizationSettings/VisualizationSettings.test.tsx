import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { VisualizationSettings } from './VisualizationSettings';

const PAN = '4111 1111 1111 1111';

const settings = {
  bands: [] as { from?: number; to?: number; status: 'OK' | 'WARN' | 'DOWN' }[],
  decimals: 0,
  prefix: '',
  suffix: '',
  min: undefined as number | undefined,
  max: undefined as number | undefined,
  thresholdLine: true,
  onFail: 'deviation' as const,
};
const data = {
  label: 'Pending',
  unit: 'QTY',
  status: 'DOWN' as const,
  value: 349,
  rule: { field: 'QTY', operator: '<' as const, limit: 200 },
};

function setup(overrides: Partial<typeof settings> = {}, onChange = vi.fn()) {
  render(<VisualizationSettings mode="big-number" settings={{ ...settings, ...overrides }} data={data} onChange={onChange} />);
  return onChange;
}

describe('FE-23 visualization settings', () => {
  it('adds a color band ("< 50" green)', async () => {
    const onChange = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Add color band' }));
    const band = screen.getByRole('group', { name: 'Band 1' });
    fireEvent.change(within(band).getByRole('spinbutton', { name: 'Up to' }), { target: { value: '50' } });
    fireEvent.change(within(band).getByRole('combobox', { name: 'State' }), { target: { value: 'OK' } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ bands: [{ to: 50, status: 'OK' }] }));
  });

  it('rejects overlapping bands', () => {
    setup({ bands: [{ to: 100, status: 'OK' }, { from: 50, to: 200, status: 'WARN' }] });
    expect(screen.getByRole('alert')).toHaveTextContent('Bands must not overlap');
  });

  it('decimals, prefix and suffix update the live preview', () => {
    setup({ decimals: 1, prefix: '#', suffix: ' items' });
    expect(within(screen.getByRole('region', { name: 'Preview' })).getByText('#349.0 items')).toBeInTheDocument();
  });

  it('decimals accept only 0 to 4', () => {
    const onChange = setup();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Decimals' }), { target: { value: '9' } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ decimals: 4 }));
  });

  it('min must be lower than max', () => {
    setup({ min: 100, max: 10 });
    expect(screen.getByRole('alert')).toHaveTextContent('Min must be lower than max');
  });

  it('toggles the threshold line', async () => {
    const onChange = setup();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Show threshold line' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ thresholdLine: false }));
  });

  it('chooses what to show when the rule fails and previews it', () => {
    setup({ onFail: 'deviation' });
    expect(screen.getByRole('combobox', { name: 'When the rule fails' })).toHaveValue('deviation');
    expect(within(screen.getByRole('region', { name: 'Preview' })).getByText('+75% over limit')).toBeInTheDocument();
  });

  it('the preview state is shown as text', () => {
    setup();
    expect(within(screen.getByRole('region', { name: 'Preview' })).getByText('DOWN')).toBeInTheDocument();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<VisualizationSettings mode="big-number" settings={settings} data={data} onChange={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('button', { name: 'Adicionar faixa de cor' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Quando a regra falhar' })).toBeInTheDocument();
    expect(screen.getByText('+75% do limite')).toBeInTheDocument();
  });

  it('a card number in the preview is masked (PCI DSS)', () => {
    const { container } = render(
      <VisualizationSettings mode="status-pill" settings={settings} data={{ label: 'Card', status: 'OK', value: PAN }} onChange={vi.fn()} />,
    );
    expect(container.innerHTML).not.toContain(PAN);
    expect(container.textContent).toContain('•••• •••• •••• 1111');
  });

  it('a prefix or suffix cannot smuggle a card number', () => {
    const onChange = setup();
    fireEvent.change(screen.getByRole('textbox', { name: 'Prefix' }), { target: { value: PAN } });
    expect(onChange).not.toHaveBeenLastCalledWith(expect.objectContaining({ prefix: PAN }));
  });
});
