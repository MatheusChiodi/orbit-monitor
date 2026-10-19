import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createI18n } from '@/shared/i18n/i18n';
import { AnimationLevelProvider } from '@/shared/motion';
import { BUILT_IN_THEMES, ORBIT_DARK, ThemeProvider, exportTheme, loadDevicePrefs, type OrbitTheme } from '@/shared/theme';
import { ThemeGallery } from './ThemeGallery';

const custom: OrbitTheme = { ...ORBIT_DARK, id: 'noc-night', name: 'NOC night', category: 'custom', basedOn: 'orbit-dark' };

function setup(props: Partial<Parameters<typeof ThemeGallery>[0]> & { customThemes?: OrbitTheme[] } = {}, wrap: (ui: ReactElement) => ReactElement = (ui) => ui) {
  const target = document.createElement('div');
  const { customThemes = [], ...rest } = props;
  const handlers = { onEdit: vi.fn(), onSaveCustom: vi.fn(), onDeleteCustom: vi.fn(), ...rest };
  render(
    wrap(
      <AnimationLevelProvider level="off" prefersReducedMotion={false}>
        <ThemeProvider target={target} search="" customThemes={customThemes}>
          <ThemeGallery {...handlers} />
        </ThemeProvider>
      </AnimationLevelProvider>,
    ),
  );
  return { target, ...handlers };
}

const cards = () => screen.getAllByRole('listitem');
const card = (name: string) => screen.getByRole('listitem', { name });

beforeEach(() => localStorage.clear());

describe('FE-03 theme gallery', () => {
  it('shows one card with a mini wall per built-in theme', () => {
    setup();
    expect(cards()).toHaveLength(BUILT_IN_THEMES.length);
    expect(screen.getByText('37 themes')).toBeInTheDocument();
    expect(within(card('Dracula')).getByText('Inspired by Dracula')).toBeInTheDocument();
  });

  it('marks the theme in use', () => {
    setup();
    expect(within(card('Orbit Dark')).getByRole('button', { name: 'Use Orbit Dark' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(card('Orbit Dark')).getByText('In use')).toBeInTheDocument();
  });

  it('filters by dark, light and accessible', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Light' }));
    expect(cards()).toHaveLength(BUILT_IN_THEMES.filter((t) => t.mode === 'light').length);
    await userEvent.click(screen.getByRole('button', { name: 'Accessible' }));
    expect(cards()).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Accessible' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(cards().length).toBe(BUILT_IN_THEMES.filter((t) => t.mode === 'dark').length);
  });

  it('searches by name and by the theme it is inspired by', async () => {
    setup();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search themes' }), 'rosé');
    expect(cards().map((c) => c.getAttribute('aria-label'))).toEqual(['Rosé Pine', 'Rosé Pine Moon', 'Rosé Pine Dawn']);
    await userEvent.clear(screen.getByRole('searchbox'));
    await userEvent.type(screen.getByRole('searchbox'), 'zzz');
    expect(screen.getByText('No theme matches "zzz"')).toBeInTheDocument();
  });

  it('search ignores accents and case', async () => {
    setup();
    await userEvent.type(screen.getByRole('searchbox'), 'FRAPPE');
    expect(cards()).toHaveLength(1);
  });

  it('click applies the theme on this device', async () => {
    const { target } = setup();
    await userEvent.click(within(card('Nord')).getByRole('button', { name: 'Use Nord' }));
    expect(target.dataset.theme).toBe('nord');
    expect(loadDevicePrefs().themeId).toBe('nord');
  });

  it('hover and focus preview the theme on the real screen, leaving restores it', () => {
    const { target } = setup();
    const button = within(card('Dracula')).getByRole('button', { name: 'Use Dracula' });
    fireEvent.pointerEnter(button);
    expect(target.dataset.theme).toBe('dracula');
    fireEvent.pointerLeave(button);
    expect(target.dataset.theme).toBe('orbit-dark');
    fireEvent.focus(button);
    expect(target.dataset.theme).toBe('dracula');
    fireEvent.blur(button);
    expect(target.dataset.theme).toBe('orbit-dark');
  });

  it('favorites are toggled with the star and listed in their own filter', async () => {
    setup();
    await userEvent.click(within(card('Kanagawa')).getByRole('button', { name: 'Add Kanagawa to favorites' }));
    expect(within(card('Kanagawa')).getByRole('button', { name: 'Remove Kanagawa from favorites' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Favorites' }));
    expect(cards()).toHaveLength(1);
  });

  it('"Restore default" goes back to Orbit Dark', async () => {
    const { target } = setup();
    await userEvent.click(within(card('Nord')).getByRole('button', { name: 'Use Nord' }));
    await userEvent.click(screen.getByRole('button', { name: 'Restore default' }));
    expect(target.dataset.theme).toBe('orbit-dark');
  });

  it('"Duplicate & edit" opens the editor with a custom copy', async () => {
    const { onEdit } = setup();
    await userEvent.click(within(card('Nord')).getByRole('button', { name: 'Duplicate & edit' }));
    const copy = vi.mocked(onEdit).mock.calls[0]![0];
    expect(copy).toMatchObject({ name: 'Nord (copy)', category: 'custom', basedOn: 'nord', colors: BUILT_IN_THEMES[3]!.colors });
    expect(copy.id).not.toBe('nord');
    expect(copy.inspiredBy).toBeUndefined();
  });

  it('custom themes can be edited and deleted', async () => {
    const { onEdit, onDeleteCustom } = setup({ customThemes: [custom] });
    await userEvent.click(screen.getByRole('button', { name: 'Custom' }));
    expect(cards()).toHaveLength(1);
    await userEvent.click(within(card('NOC night')).getByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledWith(custom);
    await userEvent.click(within(card('NOC night')).getByRole('button', { name: 'Delete' }));
    expect(onDeleteCustom).toHaveBeenCalledWith('noc-night');
  });

  it('importing an Orbit theme file shows the review and saves it as custom', async () => {
    const { onSaveCustom } = setup();
    const file = new File([exportTheme({ ...custom, name: 'Shared NOC' })], 'shared.json', { type: 'application/json' });
    await userEvent.upload(screen.getByLabelText('Import theme'), file);
    const dialog = await screen.findByRole('dialog', { name: 'Review imported theme' });
    expect(within(dialog).getByText('Every color passed the contrast guard as is.')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save imported theme' }));
    expect(onSaveCustom).toHaveBeenCalledWith(expect.objectContaining({ name: 'Shared NOC', category: 'custom' }));
  });

  it('importing a VS Code theme lists the contrast fixes before saving', async () => {
    setup();
    const vscode = JSON.stringify({
      name: 'Dim Harbor',
      type: 'dark',
      colors: { 'editor.background': '#1b1f27', 'editor.foreground': '#d7dae0', 'editorLineNumber.foreground': '#2f3440' },
    });
    await userEvent.upload(screen.getByLabelText('Import theme'), new File([vscode], 'dim.json', { type: 'application/json' }));
    const dialog = await screen.findByRole('dialog', { name: 'Review imported theme' });
    expect(within(dialog).getByText('Converted from a VS Code color theme')).toBeInTheDocument();
    expect(within(dialog).getByText(/^dim$/)).toBeInTheDocument();
    expect(within(dialog).getAllByText('#2f3440').length).toBeGreaterThan(0);
  });

  it('an invalid file shows the error', async () => {
    setup();
    await userEvent.upload(screen.getByLabelText('Import theme'), new File(['{oops'], 'bad.json', { type: 'application/json' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This file is not valid JSON');
  });

  it('exports a theme as an Orbit JSON download', async () => {
    const createObjectURL = vi.fn(() => 'blob:theme');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    setup();
    await userEvent.click(within(card('Nord')).getByRole('button', { name: 'Export' }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it('renders in pt-BR', () => {
    const i18n = createI18n('pt-BR');
    setup({}, (ui) => <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
    expect(screen.getByRole('searchbox', { name: 'Buscar temas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restaurar padrão' })).toBeInTheDocument();
    expect(screen.getByText('37 temas')).toBeInTheDocument();
  });
});
