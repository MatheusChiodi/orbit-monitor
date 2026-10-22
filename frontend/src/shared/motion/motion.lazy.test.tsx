import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.unmock('motion/react');

const { m } = await import('motion/react');
const { MotionProvider } = await import('./motion');

const SRC = join(__dirname, '..', '..');
/** shared/viz renders in its own dev gallery without MotionProvider and stays out of the wall bundle. */
const EXCLUDED = ['shared/viz/'];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('MotionProvider loads Motion features lazily (wall bundle budget)', () => {
  it('animates `m` components once the features chunk has loaded', async () => {
    render(
      <MotionProvider>
        <m.div data-testid="box" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.01 }} />
      </MotionProvider>,
    );
    expect(screen.getByTestId('box').style.opacity).toBe('0');
    await waitFor(() => expect(screen.getByTestId('box').style.opacity).toBe('1'));
  });

  it('no component imports the full `motion` component (it would pull every feature into the first load)', () => {
    const offenders = sourceFiles(SRC)
      .map((path) => ({ path: relative(SRC, path), text: readFileSync(path, 'utf8') }))
      .filter(({ path }) => !EXCLUDED.some((prefix) => path.startsWith(prefix)))
      .filter(({ text }) => /import\s*\{[^}]*\bmotion\b[^}]*\}\s*from\s*'motion\/react'/.test(text))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });
});
