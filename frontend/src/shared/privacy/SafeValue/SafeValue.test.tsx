import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { domContains, groupedPan, makeCpf, makePan } from '@/test/sensitive';
import { renderWithLocale } from '@/test/renderWithLocale';
import { SafeValue, useSafeValue } from './SafeValue';

const pan = makePan();
const maskedPan = `•••• •••• •••• ${pan.slice(-4)}`;

describe('CORE-16 SafeValue', () => {
  it('renders a PAN masked and never the full number', () => {
    const { container } = render(<SafeValue value={groupedPan(pan)} />);
    expect(screen.getByText(maskedPan)).toBeInTheDocument();
    expect(domContains(container, pan)).toBe(false);
  });

  it('marks masked values for assistive tech and styling', () => {
    render(<SafeValue value={pan} />);
    const el = screen.getByText(maskedPan);
    expect(el).toHaveAttribute('data-masked', 'true');
    expect(el).toHaveAttribute('data-class', 'PCI_PAN');
    expect(el).toHaveAccessibleDescription('Card data is always masked (PCI DSS)');
  });

  it('the masked notice is translated to pt-BR', () => {
    renderWithLocale(<SafeValue value={pan} />, 'pt-BR');
    expect(screen.getByText(maskedPan)).toHaveAccessibleDescription('Dados de cartão são sempre mascarados (PCI DSS)');
  });

  it('uses the field name to classify', () => {
    render(<SafeValue value="123" field="cvv" />);
    expect(screen.getByText('[REDACTED]')).toBeInTheDocument();
  });

  it('plain values are rendered as they are, without masking marks', () => {
    render(<SafeValue value="UP" field="STATUS" />);
    expect(screen.getByText('UP')).not.toHaveAttribute('data-masked');
  });

  it('formats numbers via the optional formatter, after redaction', () => {
    render(<SafeValue value={1500} field="PENDING_QTY" format={(v) => `${String(v)} QTY`} />);
    expect(screen.getByText('1500 QTY')).toBeInTheDocument();
  });

  it('null renders the empty dash', () => {
    render(<SafeValue value={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('copying a masked value copies only the masked text', () => {
    render(<SafeValue value={pan} />);
    const setData = vi.fn();
    fireEvent.copy(screen.getByText(maskedPan), { clipboardData: { setData, getData: vi.fn() } });
    expect(setData).toHaveBeenCalledWith('text/plain', maskedPan);
    expect(setData).not.toHaveBeenCalledWith('text/plain', expect.stringContaining(pan));
  });

  it('there is no way to unmask (no toggle, no title with the raw value)', () => {
    const { container } = render(<SafeValue value={makeCpf()} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('[title]')?.getAttribute('title') ?? '').not.toMatch(/\d{3}\.\d{3}\.\d{3}/);
  });

  it('never logs the raw value', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    render(<SafeValue value={pan} />);
    const calls = [...log.mock.calls, ...debug.mock.calls].flat().map(String).join(' ');
    expect(calls).not.toContain(pan);
    log.mockRestore();
    debug.mockRestore();
  });
});

describe('CORE-16 useSafeValue', () => {
  it('returns the masked text and its data class', () => {
    const { result } = renderHook(() => useSafeValue(pan));
    expect(result.current).toEqual({ text: maskedPan, masked: true, dataClass: 'PCI_PAN' });
  });

  it('returns plain text for non-sensitive values', () => {
    const { result } = renderHook(() => useSafeValue(347, 'PENDING_QTY'));
    expect(result.current).toEqual({ text: '347', masked: false, dataClass: null });
  });
});
