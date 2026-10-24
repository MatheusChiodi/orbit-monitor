import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { Field } from './Field';
import { TextInput } from '../TextInput';
import { TextArea } from '../TextArea';
import { Select } from '../Select';

describe('FE-61 Field', () => {
  it('labels its control and wires hint and error through aria-describedby', () => {
    render(
      <Field label="Name" hint="Shown on the wall" error="Enter a name">
        <TextInput />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input).toHaveAccessibleDescription('Shown on the wall Enter a name');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Enter a name')).toHaveAttribute('role', 'alert');
  });

  it('marks required fields for assistive tech and visually', () => {
    renderWithLocale(
      <Field label="URL" required>
        <TextInput />
      </Field>,
      'pt-BR',
    );
    expect(screen.getByRole('textbox', { name: /URL/ })).toBeRequired();
    expect(screen.getByText('obrigatório')).toBeInTheDocument();
  });

  it('TextInput forwards its ref and change events', async () => {
    const ref = createRef<HTMLInputElement>();
    const onChange = vi.fn();
    render(
      <Field label="Host">
        <TextInput ref={ref} onChange={onChange} />
      </Field>,
    );
    await userEvent.type(screen.getByRole('textbox', { name: 'Host' }), 'db');
    expect(ref.current?.value).toBe('db');
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('TextArea works inside a Field', () => {
    render(
      <Field label="Query">
        <TextArea rows={3} />
      </Field>,
    );
    expect(screen.getByRole('textbox', { name: 'Query' }).tagName).toBe('TEXTAREA');
  });

  it('Select renders a disabled placeholder option and its options', async () => {
    const onChange = vi.fn();
    render(
      <Field label="Group">
        <Select placeholder="Choose a group" defaultValue="" onChange={(e) => onChange(e.target.value)}>
          <option value="web">Web</option>
        </Select>
      </Field>,
    );
    const select = screen.getByRole('combobox', { name: 'Group' });
    expect(screen.getByRole('option', { name: 'Choose a group' })).toBeDisabled();
    await userEvent.selectOptions(select, 'web');
    expect(onChange).toHaveBeenCalledWith('web');
  });

  it('controls work without a Field when given their own label', () => {
    render(<TextInput aria-label="Search" />);
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
  });
});
