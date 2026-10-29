import { cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'dist');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const entry of ['index.html', 'assets', 'css', 'js']) {
  await cp(resolve(root, entry), resolve(out, entry), { recursive: true });
}

async function measure(directory) {
  let bytes = 0;
  let files = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await measure(path);
      bytes += nested.bytes;
      files += nested.files;
    } else if (entry.isFile()) {
      bytes += (await stat(path)).size;
      files += 1;
    }
  }
  return { bytes, files };
}

const bundle = await measure(out);
await writeFile(resolve(out, 'storage-manifest.json'), JSON.stringify({ ...bundle, builtAt: new Date().toISOString() }));

console.log('Production bundle created in dist/');
