import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { MonitorDefinition } from '@/shared/api/types';
import { renderWithLocale } from '@/test/renderWithLocale';
import { MONITOR_TEMPLATES, cloneDefinition, templateById } from '../../templates/templates';
import { TemplatePicker } from './TemplatePicker';

const original: MonitorDefinition = {
  id: 'sel_reconciliation_queue',
  name: 'Reconciliation queue',
  groupId: 'pay',
  intervalSeconds: 60,
  timeoutSeconds: 5,
  retries: 2,
  conditions: [{ field: 'PENDING_QTY', operator: '<', value: '200', level: 'DOWN' }],
  fields: [],
  type: 'HTTP',
  method: 'GET',
  url: 'https://api.example/health',
  headers: { Authorization: '•••• (vault)', Accept: 'application/json' },
};

describe('FE-32 monitor templates and clone', () => {
  describe('templates (pure)', () => {
    it('ships the documented templates', () => {
      const ids = MONITOR_TEMPLATES.map((t) => t.id);
      expect(ids).toContain('spring-actuator-health');
      expect(ids).toContain('oracle-blocking-locks');
    });

    it('Spring Actuator health checks /actuator/health with status UP', () => {
      const t = templateById('spring-actuator-health');
      expect(t?.definition).toMatchObject({ type: 'HTTP', method: 'GET' });
      expect(t?.definition.conditions).toContainEqual(expect.objectContaining({ field: '$.status', operator: '==', value: 'UP' }));
    });

    it('Oracle blocking locks is a read-only SELECT expecting zero rows', () => {
      const t = templateById('oracle-blocking-locks');
      expect(t?.definition).toMatchObject({ type: 'SQL' });
      expect(t?.definition.type === 'SQL' && t.definition.sql).toMatch(/^SELECT/i);
      expect(t?.definition.conditions).toContainEqual(expect.objectContaining({ field: '[ROWS]', value: '0' }));
    });

    it('no template contains a secret', () => {
      expect(JSON.stringify(MONITOR_TEMPLATES)).not.toMatch(/password|Bearer [A-Za-z0-9]/i);
    });
  });

  describe('cloneDefinition (pure)', () => {
    it('drops the id and prefixes the name', () => {
      const copy = cloneDefinition(original);
      expect(copy.id).toBeUndefined();
      expect(copy.name).toBe('Copy of Reconciliation queue');
      expect(copy.conditions).toEqual(original.conditions);
      expect(copy.conditions).not.toBe(original.conditions);
    });

    it('never copies vault placeholders: secrets must be typed again', () => {
      const copy = cloneDefinition(original);
      expect(copy.type === 'HTTP' && copy.headers).toEqual({ Accept: 'application/json' });
    });
  });

  it('lists templates as radio cards and starts from the chosen one', async () => {
    const onPick = vi.fn();
    render(<TemplatePicker onPick={onPick} />);
    const group = screen.getByRole('radiogroup', { name: 'Start from a template' });
    expect(group).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /Spring Actuator health/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Use template' }));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'spring-actuator-health' }));
  });

  it('offers a blank monitor', async () => {
    const onPick = vi.fn();
    render(<TemplatePicker onPick={onPick} />);
    await userEvent.click(screen.getByRole('radio', { name: /Blank monitor/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Use template' }));
    expect(onPick).toHaveBeenCalledWith(null);
  });

  it('is keyboard operable (arrows move between templates)', async () => {
    render(<TemplatePicker onPick={vi.fn()} />);
    const radios = screen.getAllByRole('radio');
    radios[0]!.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(radios[1]).toBeChecked();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<TemplatePicker onPick={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('radiogroup', { name: 'Começar de um modelo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Usar modelo' })).toBeInTheDocument();
  });
});
