import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createPreferencesStore } from '@/shared/preferences/preferences';
import { renderWithLocale } from '@/test/renderWithLocale';
import { MotionSettingsPanel } from './MotionSettingsPanel';

beforeEach(() => localStorage.clear());

describe('FE-06 animation settings panel', () => {
  it('shows every control of §1.2 with the preset values', () => {
    render(<MotionSettingsPanel store={createPreferencesStore()} reducedMotion={false} />);
    const panel = screen.getByRole('region', { name: 'Animation settings' });
    expect(within(panel).getByText('Preset: Standard')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Intensity' })).toHaveValue('60');
    expect(screen.getByRole('slider', { name: 'Speed' })).toHaveValue('1');
    for (const name of ['Component transitions', 'Status and value feedback', 'Attention signals (DOWN blink, hero glow)', 'Animated background', 'Hover and drag effects']) {
      expect(screen.getByRole('checkbox', { name })).toBeChecked();
    }
    expect(screen.getByRole('checkbox', { name: 'Intros and guides' })).not.toBeChecked();
    expect(screen.getByRole('combobox', { name: '3D and visual effects' })).toHaveValue('low');
  });

  it('editing a control turns the preset into Custom and is saved on this device', async () => {
    const store = createPreferencesStore();
    render(<MotionSettingsPanel store={store} reducedMotion={false} />);
    fireEvent.change(screen.getByRole('slider', { name: 'Speed' }), { target: { value: '0.75' } });
    await userEvent.click(screen.getByRole('checkbox', { name: 'Attention signals (DOWN blink, hero glow)' }));
    expect(store.getState().device.motion).toEqual({ speed: 0.75, attention: false });
    expect(screen.getByText('Preset: Custom')).toBeInTheDocument();
  });

  it('"Reduce motion" sets the minimal preset in one click', async () => {
    const store = createPreferencesStore();
    store.getState().setMotion({ speed: 1.5 });
    render(<MotionSettingsPanel store={store} reducedMotion={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reduce motion' }));
    expect(store.getState().device).toEqual({ animation: 'minimal' });
    expect(screen.getByText('Preset: Minimal')).toBeInTheDocument();
  });

  it('the live preview switches the sample state OK → WARNING → DOWN and simulates an incident', async () => {
    render(<MotionSettingsPanel store={createPreferencesStore()} reducedMotion={false} />);
    const preview = screen.getByRole('region', { name: 'Live preview' });
    expect(within(preview).getByText('OK')).toBeInTheDocument();
    await userEvent.click(within(preview).getByRole('button', { name: 'Play state change' }));
    expect(await within(preview).findByText('WARNING')).toBeInTheDocument();
    await userEvent.click(within(preview).getByRole('button', { name: 'Play state change' }));
    expect(await within(preview).findByText('DOWN')).toBeInTheDocument();
    await userEvent.click(within(preview).getByRole('button', { name: 'Simulate incident' }));
    expect(preview.querySelector('[data-attention]')).toHaveAttribute('data-attention', 'blink');
  });

  it('with reduced motion the controls are disabled and the reason is stated', () => {
    render(<MotionSettingsPanel store={createPreferencesStore()} reducedMotion />);
    expect(screen.getByText('Your system asks for reduced motion, so animations stay off.')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Intensity' })).toBeDisabled();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<MotionSettingsPanel store={createPreferencesStore()} reducedMotion={false} />, 'pt-BR');
    expect(screen.getByRole('region', { name: 'Configurações de animação' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reduzir movimento' })).toBeInTheDocument();
  });
});
