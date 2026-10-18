import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { domContains, groupedPan, makeCpf, makePan } from '@/test/sensitive';
import { Timeline } from './Timeline';

const pan = makePan();
const cpf = makeCpf();

describe('CORE-16 Timeline privacy', () => {
  it('a PAN or CPF in an event title/detail never reaches the DOM', () => {
    const { container } = render(
      <Timeline
        events={[
          { id: 'e1', at: '2026-10-18T17:00:00.000Z', kind: 'DOWN', title: `Charge ${groupedPan(pan, '-')} failed`, detail: `doc ${cpf}` },
        ]}
        freshIds={new Set()}
      />,
    );
    expect(domContains(container, pan)).toBe(false);
    expect(domContains(container, cpf.replace(/\D/g, ''))).toBe(false);
    expect(screen.getByText(`Charge •••• •••• •••• ${pan.slice(-4)} failed`)).toBeInTheDocument();
  });
});
