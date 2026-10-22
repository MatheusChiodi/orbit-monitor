import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fromEntries, type CustomizationApi } from './api';
import { CustomizationProvider } from './CustomizationProvider';
import { createCustomizationStore } from './store';
import { useSetting } from './useSetting';

const api: CustomizationApi = {
  load: async () => fromEntries([]),
  saveScope: async () => undefined,
  deleteEntry: async () => undefined,
  saveProfile: async () => undefined,
  loadTerminology: async () => ({ en: {}, 'pt-BR': {} }),
  saveTerminology: async () => undefined,
};

function Variant({ instanceId }: { instanceId?: string }) {
  const variant = useSetting<string>('card.monitor.variant', { instanceId });
  return <span>{variant}</span>;
}

beforeEach(() => localStorage.clear());

describe('useSetting', () => {
  it('returns the product default without a provider (wall and tests keep working)', () => {
    render(<Variant />);
    expect(screen.getByText('regular')).toBeInTheDocument();
  });

  it('follows the scopes of the provider and re-renders on change', () => {
    const store = createCustomizationStore({ api });
    render(
      <CustomizationProvider store={store} layoutId="noc">
        <Variant instanceId="card.monitor:m1" />
      </CustomizationProvider>,
    );
    act(() => void store.getState().setValue('device', 'card.monitor.variant', 'compact'));
    expect(screen.getByText('compact')).toBeInTheDocument();
    act(() => store.setState({ layouts: { noc: { 'card.monitor.variant': 'detailed' } } }));
    expect(screen.getByText('detailed')).toBeInTheDocument();
    act(() => store.setState({ instances: { 'card.monitor:m1': { 'card.monitor.variant': 'regular' } } }));
    expect(screen.getByText('regular')).toBeInTheDocument();
  });
});
