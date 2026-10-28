import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'dist');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const entry of ['index.html', 'assets', 'css', 'js']) {
  await cp(resolve(root, entry), resolve(out, entry), { recursive: true });
}

console.log('Production bundle created in dist/');
