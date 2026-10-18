import { describe, expect, it } from 'vitest';
import type { Incident } from '@/shared/api/types';
import { mockSnapshot } from '../mock';
import { alsoActive, groupRows, pickHero } from './selectors';

const now = new Date(2026, 9, 18, 17, 10, 0);

function incident(id: string, extra: Partial<Incident>): Incident {
  return {
    id,
    monitorId: 'conciliacao',
    severity: 'DOWN',
    openedAt: now.toISOString(),
    acknowledgedBy: null,
    acknowledgedAt: null,
    impact: [],
    escalatesAt: null,
    ...extra,
  };
}

describe('pickHero', () => {
  it('escolhe o incidente fora sem responsável', () => {
    const hero = pickHero(mockSnapshot('incident', now));
    expect(hero?.monitor.id).toBe('conciliacao');
    expect(hero?.incident?.id).toBe('inc-conciliacao');
    expect(hero?.group?.name).toBe('Pagamentos');
  });

  it('null quando tudo está ok', () => {
    expect(pickHero(mockSnapshot('ok', now))).toBeNull();
  });

  it('fora vence atenção mesmo reconhecido', () => {
    const snap = mockSnapshot('incident', now);
    snap.incidents = [
      incident('w', { monitorId: 'adquirente', severity: 'WARN' }),
      incident('d', { monitorId: 'conciliacao', acknowledgedBy: 'Ana', acknowledgedAt: now.toISOString() }),
    ];
    expect(pickHero(snap)?.incident?.id).toBe('d');
  });

  it('monitor em problema sem incidente aberto também vira herói', () => {
    const snap = mockSnapshot('incident', now);
    snap.incidents = [];
    expect(pickHero(snap)?.monitor.id).toBe('conciliacao');
    expect(pickHero(snap)?.incident).toBeNull();
  });
});

describe('alsoActive', () => {
  it('lista os outros problemas, exceções primeiro, sem o herói', () => {
    const snap = mockSnapshot('incident', now);
    const list = alsoActive(snap, 'conciliacao');
    expect(list.map((m) => m.id)).not.toContain('conciliacao');
    expect(list.every((m) => m.status !== 'OK')).toBe(true);
    expect(list).toHaveLength(2);
  });
});

describe('groupRows', () => {
  it('grupos com problema sobem e células com problema vêm primeiro', () => {
    const rows = groupRows(mockSnapshot('incident', now));
    expect(rows[0]?.group.name).toBe('Pagamentos');
    expect(rows[0]?.monitors[0]?.id).toBe('conciliacao');
    expect(rows[0]?.status).toBe('DOWN');
    expect(rows[0]?.summary).toBe('2/4 ok · FORA');
  });
  it('grupos sem monitores são omitidos', () => {
    const snap = mockSnapshot('ok', now);
    snap.groups.push({ id: 'vazio', name: 'Vazio' });
    expect(groupRows(snap).some((r) => r.group.id === 'vazio')).toBe(false);
  });
});
