import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createI18n } from '@/shared/i18n/i18n';
import { renderWithLocale } from '@/test/renderWithLocale';
import { ActorLabel } from './ActorLabel';
import { actorText, clientKindOf } from './actor';

describe('actor fields hold the client kind, not a person', () => {
  it('recognizes the three client kinds and nothing else', () => {
    expect(clientKindOf('loopback')).toBe('loopback');
    expect(clientKindOf('lan')).toBe('lan');
    expect(clientKindOf('unknown')).toBe('unknown');
    expect(clientKindOf('R. Lima')).toBeNull();
    expect(clientKindOf('LAN')).toBeNull();
  });

  it('actorText localizes the kind and keeps any legacy value as it is', () => {
    const en = createI18n('en').t;
    const pt = createI18n('pt-BR').t;
    expect(actorText('loopback', en)).toBe('This machine');
    expect(actorText('lan', en)).toBe('Local network');
    expect(actorText('unknown', en)).toBe('Unknown');
    expect(actorText('loopback', pt)).toBe('Esta máquina');
    expect(actorText('lan', pt)).toBe('Rede local');
    expect(actorText('unknown', pt)).toBe('Desconhecido');
    expect(actorText('R. Lima', en)).toBe('R. Lima');
  });

  it('renders the localized label (en and pt-BR)', () => {
    render(<ActorLabel actor="lan" />);
    expect(screen.getByText('Local network')).toBeInTheDocument();
    renderWithLocale(<ActorLabel actor="loopback" />, 'pt-BR');
    expect(screen.getByText('Esta máquina')).toBeInTheDocument();
  });

  it('a legacy value goes through SafeValue (a card number is never displayed)', () => {
    render(<ActorLabel actor="4111 1111 1111 1111" />);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/4111\s?1111\s?1111\s?1111/);
    expect(text).toContain('•••• •••• •••• 1111');
  });
});
