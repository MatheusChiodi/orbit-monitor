import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = resolve(__dirname, '..');
const css = readFileSync(resolve(__dirname, 'wall.css'), 'utf8');
const excluded = [...css.matchAll(/@source not '\.\.\/(shared\/ui\/[A-Za-z]+)'/g)].map((m) => resolve(SRC, m[1]!));

function resolveImport(from: string, spec: string): string | null {
  const base = spec.startsWith('@/') ? resolve(SRC, spec.slice(2)) : spec.startsWith('.') ? resolve(dirname(from), spec) : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, resolve(base, 'index.ts'), resolve(base, 'index.tsx')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const UI = resolve(SRC, 'shared/ui');

/** Exported name → source file, for the `@/shared/ui` barrel (the bundler keeps only what is imported). */
function barrelExports(): Map<string, string> {
  const map = new Map<string, string>();
  const visit = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = resolve(dir, name);
      if (statSync(path).isDirectory()) visit(path);
      else if (/(?<!\.test)\.tsx?$/.test(name) && name !== 'index.ts') {
        for (const m of readFileSync(path, 'utf8').matchAll(/export (?:function|const|class|type|interface) (\w+)/g)) map.set(m[1]!, path);
      }
    }
  };
  visit(UI);
  return map;
}

/** Every source file the wall entry can load, through static and dynamic imports. */
function wallGraph(): Set<string> {
  const exports = barrelExports();
  const seen = new Set<string>();
  const queue = [resolve(SRC, 'app/wall-main.tsx')];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file) || !/\.tsx?$/.test(file)) continue;
    seen.add(file);
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'@\/shared\/ui'/g)) {
      for (const raw of m[1]!.split(',')) {
        const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]!;
        const target = exports.get(name);
        if (target) queue.push(target);
      }
    }
    for (const m of text.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)'([^']+)'/g)) {
      if (m[1] === '@/shared/ui') continue;
      const target = resolveImport(file, m[1]!);
      if (target) queue.push(target);
    }
  }
  return seen;
}

describe('wall.css (150 KB gzip budget)', () => {
  it('excludes only console primitives the wall never renders', () => {
    expect(excluded.length).toBeGreaterThan(0);
    const reached = [...wallGraph()].filter((file) => excluded.some((dir) => file.startsWith(dir)));
    // A primitive listed here is used by the wall: remove its `@source not` line from wall.css.
    expect(reached).toEqual([]);
  });
});
