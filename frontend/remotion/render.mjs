// Renders the Orbit compositions with the Remotion CLI.
//   npm run remotion:render            -> remotion/out/<id>.mp4 (1280x720, ignored by git)
//   npm run remotion:render -- --readme -> also docs/assets/readme/<id>.gif (640 px, 15 fps, <= 5 MB)
import { spawnSync } from 'node:child_process';
import { mkdirSync, statSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const frontend = resolve(here, '..');
const entry = join('remotion', 'index.ts');
const out = join(here, 'out');
const readmeDir = resolve(frontend, '..', 'docs', 'assets', 'readme');
const ids = ['orbit-boot', 'check-flow', 'first-monitor'];
const readme = process.argv.includes('--readme');
const only = process.argv.find((arg) => ids.includes(arg));
const MAX_README_BYTES = 5 * 1024 * 1024;

function remotion(args) {
  // `shell` is needed for npx on Windows; quote every argument because the path may contain spaces.
  const quoted = args.map((arg) => `"${arg}"`);
  const result = spawnSync('npx', ['remotion', ...quoted], { cwd: frontend, stdio: 'inherit', shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

mkdirSync(out, { recursive: true });
for (const id of only ? [only] : ids) {
  remotion(['render', entry, id, join(out, `${id}.mp4`), '--gl=angle']);
  if (!readme) continue;
  mkdirSync(readmeDir, { recursive: true });
  const gif = join(readmeDir, `${id}.gif`);
  remotion(['render', entry, id, gif, '--codec=gif', '--every-nth-frame=2', '--scale=0.5', '--gl=angle']);
  const size = statSync(gif).size;
  if (size > MAX_README_BYTES) {
    rmSync(gif);
    console.error(`${id}.gif is ${(size / 1048576).toFixed(1)} MB (> 5 MB); not kept for the README.`);
    process.exitCode = 1;
  } else {
    console.log(`${id}.gif: ${(size / 1024).toFixed(0)} KB`);
  }
}
