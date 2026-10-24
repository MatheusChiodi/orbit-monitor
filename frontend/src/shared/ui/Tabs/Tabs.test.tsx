import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Tabs } from './Tabs';

function Harness() {
  const [value, setValue] = useState('visual');
  return (
    <Tabs
      label="Condition editor"
      value={value}
      onChange={setValue}
      items={[
        { value: 'visual', label: 'Visual', content: <p>visual body</p> },
        { value: 'text', label: 'Text', content: <p>text body</p> },
      ]}
    />
  );
}

describe('FE-61 Tabs', () => {
  it('renders a labelled tablist and the active panel', () => {
    render(<Harness />);
    expect(screen.getByRole('tablist', { name: 'Condition editor' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Visual' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Visual' })).toHaveTextContent('visual body');
    expect(screen.queryByText('text body')).not.toBeInTheDocument();
  });

  it('arrow keys, Home and End move between tabs and activate them', async () => {
    render(<Harness />);
    screen.getByRole('tab', { name: 'Visual' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Text' })).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: 'Text' })).toHaveTextContent('text body');
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Visual' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Text' })).toHaveAttribute('aria-selected', 'true');
  });
});
