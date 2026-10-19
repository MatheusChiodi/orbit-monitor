import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { COLOR_TOKENS, ORBIT_DARK, SYNTAX_TOKENS, checkPalette, type OrbitTheme } from '@/shared/theme';
import { ThemeEditor } from './ThemeEditor';

const theme: OrbitTheme = { ...ORBIT_DARK, id: 'custom', name: 'Custom', category: 'custom' };

function setup(overrides: Partial<Parameters<typeof ThemeEditor>[0]> = {}) {
  const props = { theme, onSave: vi.fn(), onCancel: vi.fn(), ...overrides };
  render(<ThemeEditor {...props} />);
  return props;
}

describe('FE-01 theme editor', () => {
  it('has one labelled color input per token, chart series, syntax and FX color', () => {
    setup();
    for (const token of COLOR_TOKENS) expect(screen.getByLabelText(new RegExp(`^${token}$`, 'i'))).toBeInTheDocument();
    for (let i = 1; i <= 6; i++) expect(screen.getByLabelText(`chart ${i}`)).toBeInTheDocument();
    for (const token of SYNTAX_TOKENS) expect(screen.getByLabelText(`syntax ${token}`)).toBeInTheDocument();
    for (const token of ['from', 'to', 'glow']) expect(screen.getByLabelText(`fx ${token}`)).toBeInTheDocument();
  });

  it('shows live previews of the wall and the console', () => {
    setup();
    expect(screen.getByRole('region', { name: 'Wall preview' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Console preview' })).toBeInTheDocument();
  });

  it('editing a token updates the preview immediately', () => {
    setup();
    fireEvent.change(screen.getByLabelText(/^down$/i), { target: { value: '#ff0000' } });
    const preview = screen.getByRole('region', { name: 'Wall preview' });
    expect(preview.style.getPropertyValue('--down')).toBe('#ff0000');
  });

  it('the color picker edits the same token', () => {
    setup();
    fireEvent.input(screen.getByLabelText('Pick info'), { target: { value: '#4aa8ff' } });
    expect(screen.getByLabelText(/^info$/i)).toHaveValue('#4aa8ff');
  });

  it('ignores invalid hex until it is complete', () => {
    setup();
    fireEvent.change(screen.getByLabelText(/^bg$/i), { target: { value: 'url(x)' } });
    const preview = screen.getByRole('region', { name: 'Wall preview' });
    expect(preview.style.getPropertyValue('--bg')).toBe(theme.colors.bg);
    expect(screen.getByLabelText(/^bg$/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('the preview shows states with text, never color alone', () => {
    setup();
    const preview = screen.getByRole('region', { name: 'Wall preview' });
    for (const label of ['DOWN', 'WARNING', 'OK']) expect(within(preview).getByText(label)).toBeInTheDocument();
  });

  it('contrast problems are listed and block saving', async () => {
    const props = setup();
    fireEvent.change(screen.getByLabelText(/^text$/i), { target: { value: '#151a20' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/contrast/i);
    expect(screen.getByRole('button', { name: 'Save theme' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Use suggested value' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save theme' })).toBeEnabled();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it('"Fix all" repairs every problem at once', async () => {
    setup();
    fireEvent.change(screen.getByLabelText(/^text$/i), { target: { value: '#151a20' } });
    fireEvent.change(screen.getByLabelText(/^warn$/i), { target: { value: '#ff3b4f' } });
    await userEvent.click(screen.getByRole('button', { name: 'Fix all' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('saves the edited theme with its name', async () => {
    const props = setup();
    await userEvent.clear(screen.getByLabelText('Theme name'));
    await userEvent.type(screen.getByLabelText('Theme name'), 'NOC night');
    await userEvent.click(screen.getByRole('button', { name: 'Save theme' }));
    const saved = vi.mocked(props.onSave).mock.calls[0]![0];
    expect(saved).toMatchObject({ name: 'NOC night', colors: theme.colors, category: 'custom' });
    expect(checkPalette(saved)).toEqual([]);
  });

  it('starting from a preset copies its colors', async () => {
    setup();
    await userEvent.selectOptions(screen.getByLabelText('Start from preset'), 'high-contrast-dark');
    expect(screen.getByLabelText(/^bg$/i)).not.toHaveValue(theme.colors.bg);
    expect(screen.getByLabelText(/^bg$/i)).toHaveValue('#000000');
  });

  it('keyboard: Escape cancels', async () => {
    const props = setup();
    screen.getByLabelText('Theme name').focus();
    await userEvent.keyboard('{Escape}');
    expect(props.onCancel).toHaveBeenCalled();
  });

  it('view-only mode disables every input and hides Save', () => {
    setup({ readOnly: true });
    expect(screen.getByLabelText(/^bg$/i)).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save theme' })).toBeNull();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<ThemeEditor theme={theme} onSave={vi.fn()} onCancel={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('region', { name: 'Pré-visualização da parede' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar tema' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome do tema')).toBeInTheDocument();
  });
});
