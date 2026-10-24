import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fromEntries, type CustomizationApi } from '@/shared/customization/api';
import { createCustomizationStore } from '@/shared/customization/store';
import { useSetting } from '@/shared/customization/useSetting';
import { WallCustomization } from './WallCustomization';

function Probe() {
  return <span>{useSetting<string>('card.monitor.variant')}</span>;
}

afterEach(() => {
  for (const key of Object.keys(document.documentElement.dataset)) delete document.documentElement.dataset[key];
});

describe('customization on the wall', () => {
  it('reads the layout scope of the wall being shown and applies its look', async () => {
    const api = {
      load: vi.fn(async () => ({ ...fromEntries([]), layouts: { noc: { 'card.monitor.variant': 'compact', 'shape.glass': false } } })),
      loadTerminology: vi.fn(async () => ({ en: {}, 'pt-BR': {} })),
    } as unknown as CustomizationApi;
    render(
      <WallCustomization store={createCustomizationStore({ api })} layoutId="noc">
        <Probe />
      </WallCustomization>,
    );
    expect(await screen.findByText('compact')).toBeInTheDocument();
    expect(document.documentElement.dataset.glass).toBe('off');
  });

  it('FE-53: a wall opened from a device with edit access can be customized (editor code loads on demand)', async () => {
    const api = { load: vi.fn(async () => fromEntries([])), loadTerminology: vi.fn(async () => ({ en: {}, 'pt-BR': {} })) } as unknown as CustomizationApi;
    render(
      <WallCustomization store={createCustomizationStore({ api })} layoutId="noc" getAccess={async () => ({ mode: 'edit', client: 'loopback' })}>
        <Probe />
      </WallCustomization>,
    );
    // The editor chunk is imported on demand; under a full parallel run that can take a few seconds.
    expect(await screen.findByRole('button', { name: 'Customize' }, { timeout: 5000 })).toBeInTheDocument();
  });

  it('FE-53: view-only walls never show Customize', async () => {
    const api = { load: vi.fn(async () => fromEntries([])), loadTerminology: vi.fn(async () => ({ en: {}, 'pt-BR': {} })) } as unknown as CustomizationApi;
    const getAccess = vi.fn(async () => ({ mode: 'view-only' as const, client: 'lan' as const }));
    render(
      <WallCustomization store={createCustomizationStore({ api })} layoutId="noc" getAccess={getAccess}>
        <Probe />
      </WallCustomization>,
    );
    await screen.findByText('regular');
    await vi.waitFor(() => expect(getAccess).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Customize' })).not.toBeInTheDocument();
  });
});
