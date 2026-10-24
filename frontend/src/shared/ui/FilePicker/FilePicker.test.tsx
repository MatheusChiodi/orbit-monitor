import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { Field } from '../Field';
import { FilePicker } from './FilePicker';

describe('FE-61 FilePicker', () => {
  it('a styled button picks a file and shows its name', async () => {
    const onFile = vi.fn();
    render(
      <Field label="Configuration file">
        <FilePicker accept=".json" onFile={onFile} />
      </Field>,
    );
    expect(screen.getByText('No file chosen')).toBeInTheDocument();
    const file = new File(['{}'], 'orbit.monitors.json', { type: 'application/json' });
    await userEvent.upload(screen.getByLabelText('Configuration file'), file);
    expect(onFile).toHaveBeenCalledWith(file);
    expect(screen.getByText('orbit.monitors.json')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose file' })).toBeInTheDocument();
  });

  it('can clear the chosen file', async () => {
    const onFile = vi.fn();
    render(<FilePicker aria-label="Theme file" onFile={onFile} />);
    await userEvent.upload(screen.getByLabelText('Theme file'), new File(['x'], 'theme.json'));
    await userEvent.click(screen.getByRole('button', { name: 'Remove file' }));
    expect(onFile).toHaveBeenLastCalledWith(null);
    expect(screen.getByText('No file chosen')).toBeInTheDocument();
  });

  it('speaks Portuguese in pt-BR (never the browser default text)', () => {
    renderWithLocale(<FilePicker aria-label="Arquivo" onFile={() => {}} />, 'pt-BR');
    expect(screen.getByRole('button', { name: 'Escolher arquivo' })).toBeInTheDocument();
    expect(screen.getByText('Nenhum arquivo escolhido')).toBeInTheDocument();
  });
});
