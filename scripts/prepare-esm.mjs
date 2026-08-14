import { writeFile } from 'node:fs/promises';

const packageFile = new URL('../dist/esm/package.json', import.meta.url);
await writeFile(packageFile, '{\n  "type": "module"\n}\n', 'utf8');
