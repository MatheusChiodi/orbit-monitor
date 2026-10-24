import { describe, expect, it } from 'vitest';
import type { WallLayout } from '@/domains/workspace/layout/layoutsApi';
import { createDemoServices } from './demoServices';

describe('FE-63 demo services (memory only)', () => {
  it('wall layouts can be saved, listed and removed without a server', async () => {
    const { layoutsApi } = createDemoServices();
    const layout = { id: 'l-1', slug: 'noc', name: 'NOC', version: 1, blocks: [] } as unknown as WallLayout;
    await layoutsApi.save(layout);
    expect(await layoutsApi.list()).toEqual([layout]);
    await layoutsApi.remove?.('l-1');
    expect(await layoutsApi.list()).toEqual([]);
  });

  it('workspace defaults echo back', async () => {
    const { saveDefaults } = createDemoServices();
    expect(await saveDefaults({ density: 'compact' })).toEqual({ density: 'compact' });
  });
});
