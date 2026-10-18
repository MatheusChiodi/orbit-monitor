import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { domContains, makeCpf, makePan } from '@/test/sensitive';
import { mockSnapshot } from '../../mock';
import { WallScreen } from './WallScreen';

const now = new Date(2026, 9, 18, 17, 10, 0);

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('CORE-16 the wall never shows personal or card data', () => {
  it('PAN, CPF and e-mail injected anywhere in the snapshot never reach the DOM', () => {
    const pan = makePan();
    const cpf = makeCpf();
    const snap = mockSnapshot('incident', now);
    snap.monitors[0] = { ...snap.monitors[0]!, name: `Card ${pan}` };
    snap.timeline[0] = { ...snap.timeline[0]!, detail: `customer ${cpf} jane.doe@domain.com` };
    snap.incidents[0] = { ...snap.incidents[0]!, impact: [`card ${pan}`] };
    const { container } = render(
      <WallScreen snapshot={snap} now={now} connection="open" freshEventIds={new Set()} onAcknowledge={vi.fn()} />,
    );
    expect(domContains(container, pan)).toBe(false);
    expect(domContains(container, cpf.replace(/\D/g, ''))).toBe(false);
    expect(container.textContent).not.toContain('jane.doe@domain.com');
  });

  it('personal data is hidden on the wall, not just masked', () => {
    const snap = mockSnapshot('incident', now);
    snap.timeline[0] = { ...snap.timeline[0]!, detail: 'contact jane.doe@domain.com' };
    const { container } = render(
      <WallScreen snapshot={snap} now={now} connection="open" freshEventIds={new Set()} onAcknowledge={vi.fn()} />,
    );
    expect(container.textContent).not.toContain('j•••@d•••.com');
  });
});
