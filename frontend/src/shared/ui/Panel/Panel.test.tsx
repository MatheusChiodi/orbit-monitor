import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Panel } from './Panel';

describe('Panel', () => {
  it('é uma região rotulada pelo título', () => {
    render(<Panel title="Perto do limite">conteúdo</Panel>);
    expect(screen.getByRole('region', { name: 'Perto do limite' })).toHaveTextContent('conteúdo');
  });

  it('mostra ações à direita do título', () => {
    render(
      <Panel title="Linha do tempo" actions={<span>ao vivo</span>}>
        x
      </Panel>,
    );
    expect(screen.getByText('ao vivo')).toBeInTheDocument();
  });

  it('sem título continua renderizando os filhos', () => {
    render(<Panel>só corpo</Panel>);
    expect(screen.getByText('só corpo')).toBeInTheDocument();
  });

  it('marca o tom de estado para a barra lateral', () => {
    render(
      <Panel title="Situação" tone="DOWN">
        x
      </Panel>,
    );
    expect(screen.getByRole('region')).toHaveAttribute('data-tone', 'DOWN');
  });
});

describe('Panel pulse', () => {
  it('pisca a barra lateral quando pulse', () => {
    const { container } = render(
      <Panel title="Situação" tone="DOWN" pulse>
        x
      </Panel>,
    );
    const bar = container.querySelector('[data-pulse="true"]');
    expect(bar).not.toBeNull();
    expect(bar?.className).toContain('anim-blink');
  });
});
