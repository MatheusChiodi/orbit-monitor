import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createI18n } from '@/shared/i18n/i18n';
import { AnimationLevelProvider } from '@/shared/motion';
import { BUILT_IN_THEMES, ORBIT_DARK, ThemeProvider, exportTheme, type OrbitTheme } from '@/shared/theme';
import { CURATED_THEME_IDS, ThemeGallery } from './ThemeGallery';

const custom: OrbitTheme = { ...ORBIT_DARK, id: 'noc-night', name: 'NOC night', category: 'custom', basedOn: 'orbit-dark' };

type Props = Parameters<typeof ThemeGallery>[0];

function setup(props: Partial<Props> & { customThemes?: OrbitTheme[] } = {}, wrap: (ui: ReactElement) => ReactElement = (ui) => ui) {
  const target = document.createElement('div');
  const { customThemes = [], ...rest } = props;
  const handlers = { onEdit: vi.fn(), onSaveCustom: vi.fn(), onDeleteCustom: vi.fn(), onSelect: vi.fn(), selectedId: 'orbit-dark', appliedId: 'orbit-dark', ...rest };
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
const showAll = () => userEvent.click(screen.getByRole('button', { name: /Show all \d+ themes/ }));
const openMenu = (name: string) => userEvent.click(within(card(name)).getByRole('button', { name: `More actions for ${name}` }));

beforeEach(() => localStorage.clear());

describe('FE-03 theme gallery (FE-72 curated view)', () => {
  it('starts with eight suggested themes: Orbit Dark first, light, high contrast, colorblind-safe, four editor themes', () => {
    setup();
    expect(cards()).toHaveLength(CURATED_THEME_IDS.length);
    expect(cards()[0]).toHaveAccessibleName('Orbit Dark');
    const modes = CURATED_THEME_IDS.map((id) => BUILT_IN_THEMES.find((t) => t.id === id)!);
    expect(modes.some((t) => t.mode === 'light')).toBe(true);
    expect(modes.filter((t) => t.category === 'accessible').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('keeps the theme in use visible even when it is not suggested', () => {
    setup({ appliedId: 'kanagawa' });
    expect(card('Kanagawa')).toBeInTheDocument();
    expect(within(card('Kanagawa')).getByText('In use')).toBeInTheDocument();
  });

  it('lists your own themes apart', () => {
    setup({ customThemes: [custom] });
    expect(screen.getByRole('heading', { name: 'Your themes' })).toBeInTheDocument();
    expect(card('NOC night')).toBeInTheDocument();
  });

  it('"Show all" reveals every theme with search and filters', async () => {
    setup();
    await showAll();
    expect(cards()).toHaveLength(BUILT_IN_THEMES.length);
    expect(screen.getByText('37 themes')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(cards()).toHaveLength(BUILT_IN_THEMES.filter((t) => t.mode === 'light').length);
    await userEvent.click(screen.getByRole('radio', { name: 'Accessible' }));
    expect(cards()).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Show suggested themes' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('searches by name, ignoring accents and case', async () => {
    setup();
    await showAll();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search themes' }), 'rosé');
    expect(cards().map((c) => c.getAttribute('aria-label'))).toEqual(['Rosé Pine', 'Rosé Pine Moon', 'Rosé Pine Dawn']);
    await userEvent.clear(screen.getByRole('searchbox'));
    await userEvent.type(screen.getByRole('searchbox'), 'FRAPPE');
    expect(cards()).toHaveLength(1);
    await userEvent.clear(screen.getByRole('searchbox'));
    await userEvent.type(screen.getByRole('searchbox'), 'zzz');
    expect(screen.getByText('No theme matches "zzz"')).toBeInTheDocument();
  });

  it('choosing a card selects it (the page previews it); it does not apply on its own', async () => {
    const { onSelect } = setup({ selectedId: 'orbit-dark' });
    await userEvent.click(within(card('Nord')).getByRole('button', { name: 'Use Nord' }));
    expect(onSelect).toHaveBeenCalledWith('nord');
    expect(within(card('Orbit Dark')).getByRole('button', { name: 'Use Orbit Dark' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('per-card actions live in a "…" menu instead of a row of buttons', async () => {
    const { onEdit } = setup();
    expect(within(card('Nord')).queryByRole('button', { name: 'Export' })).toBeNull();
    await openMenu('Nord');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Duplicate & edit' }));
    const copy = vi.mocked(onEdit).mock.calls[0]![0];
    expect(copy).toMatchObject({ name: 'Nord (copy)', category: 'custom', basedOn: 'nord' });
    expect(copy.id).not.toBe('nord');
  });

  it('custom themes can be edited and deleted from their menu', async () => {
    const { onEdit, onDeleteCustom } = setup({ customThemes: [custom] });
    await openMenu('NOC night');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledWith(custom);
    await openMenu('NOC night');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(onDeleteCustom).toHaveBeenCalledWith('noc-night');
  });

  it('exports a theme as an Orbit JSON download', async () => {
    const createObjectURL = vi.fn(() => 'blob:theme');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    setup();
    await openMenu('Nord');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Export' }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it('favorites are toggled with the star and listed in their own filter', async () => {
    setup();
    await userEvent.click(within(card('Nord')).getByRole('button', { name: 'Add Nord to favorites' }));
    expect(within(card('Nord')).getByRole('button', { name: 'Remove Nord from favorites' })).toHaveAttribute('aria-pressed', 'true');
    await showAll();
    await userEvent.click(screen.getByRole('radio', { name: 'Favorites' }));
    expect(cards()).toHaveLength(1);
  });

  it('"Restore default" sits in the theme menu', async () => {
    const { target } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'More theme options' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Restore default' }));
    expect(target.dataset.theme).toBe('orbit-dark');
  });

  it('importing an Orbit theme file shows the review and saves it as custom', async () => {
    const { onSaveCustom } = setup();
    const file = new File([exportTheme({ ...custom, name: 'Shared NOC' })], 'shared.json', { type: 'application/json' });
    await userEvent.upload(screen.getByLabelText('Import theme'), file);
    const dialog = await screen.findByRole('dialog', { name: 'Review imported theme' });
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
  });

  it('an invalid file shows the error', async () => {
    setup();
    await userEvent.upload(screen.getByLabelText('Import theme'), new File(['{oops'], 'bad.json', { type: 'application/json' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This file is not valid JSON');
  });

  it('renders in pt-BR', async () => {
    const i18n = createI18n('pt-BR');
    setup({}, (ui) => <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
    expect(screen.getByRole('button', { name: 'Mostrar todos os 37 temas' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar todos os 37 temas' }));
    expect(screen.getByRole('searchbox', { name: 'Buscar temas' })).toBeInTheDocument();
    expect(screen.getByText('37 temas')).toBeInTheDocument();
  });
});
