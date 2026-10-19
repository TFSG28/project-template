// Prisma 7 generates plain JS into src/generated; tsc only emits .ts files.
// Copy the generated client (and its wasm assets) into dist for `npm start`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'src', 'generated');
const destination = path.join(root, 'dist', 'generated');

if (!fs.existsSync(source)) {
    console.error('Prisma client não encontrado em src/generated. Corre `prisma generate`.');
    process.exit(1);
}

fs.rmSync(destination, { recursive: true, force: true });
fs.cpSync(source, destination, { recursive: true });
console.log('Prisma client copiado para dist/generated');
