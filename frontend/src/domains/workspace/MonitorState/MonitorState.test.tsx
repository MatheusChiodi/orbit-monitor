import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MonitorView } from '@/shared/api/types';
import { MonitorStateBadge, monitorState } from './MonitorState';

const unknown = { status: 'UNKNOWN' } as unknown as MonitorView;

describe('monitor state in the console', () => {
  it('a monitor that has not run yet is waiting; a paused one is paused', () => {
    expect(monitorState(unknown)).toBe('WAITING');
    expect(monitorState({ status: 'DOWN', paused: true })).toBe('PAUSED');
    expect(monitorState({ status: 'WARN' })).toBe('WARN');
  });

  it('never shows a raw key', () => {
    render(<MonitorStateBadge monitor={unknown} />);
    expect(screen.getByText('Waiting for first check')).toBeInTheDocument();
    expect(screen.queryByText(/ui\.status/)).toBeNull();
  });
});
