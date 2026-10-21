// Verifica que a documentação acompanha o código:
// 1. Toda rota method-based em backend/src/**/*.routes.ts existe em docs/openapi.yaml.
// 2. Todo código de erro usado no backend está documentado em API.md.
// Uso: node scripts/check-docs.mjs (a partir da raiz). Falha só em ausências reais.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const API_MD = path.join(ROOT, 'API.md');
const OPENAPI = path.join(ROOT, 'docs', 'openapi.yaml');
const SRC = path.join(ROOT, 'backend', 'src');
const BASE = '/api/v1';

const METHOD_RE = /\.(get|post|put|patch|delete)\(\s*'([^']+)'/g;
const MOUNT_RE = /\.use\(\s*'([^']+)'/g;

const read = (p) => readFileSync(p, 'utf8');

/** Extrai rotas de um ficheiro de routes; mounts de previsão (`router.use('/auth')`) aplicam-se às rotas que aparecem depois. */
const extractPaths = (source) => {
    const tokens = [
        ...[...source.matchAll(MOUNT_RE)]
            .map((m) => ({ index: m.index, type: 'mount', prefix: m[1] }))
            .filter((t) => t.prefix !== '/'),
        ...[...source.matchAll(METHOD_RE)].map((m) => ({
            index: m.index,
            type: 'route',
            path: m[2],
        })),
    ].sort((a, b) => a.index - b.index);

    const prefixes = [];
    const paths = [];
    for (const token of tokens) {
        if (token.type === 'mount') prefixes.push(token.prefix);
        else prefixes.forEach((p) => paths.push(p + token.path));
    }
    return paths;
};

const scanRouteFiles = () => {
    const found = new Set();
    const walk = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const abs = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(abs);
            else if (entry.name.endsWith('.routes.ts')) {
                extractPaths(read(abs)).forEach((p) => found.add(p));
            }
        }
    };
    walk(SRC);
    // index.ts não tem suffixo .routes.ts: monta /health e /auth|/user|... prefixos
    extractPaths(read(path.join(SRC, 'shared', 'routes', 'index.ts'))).forEach((p) => found.add(p));
    return found;
};

const collectErrorCodes = () => {
    const codes = new Set();
    const walk = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (['generated', 'dist', 'node_modules'].includes(entry.name)) continue;
            const abs = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(abs);
            else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
                const source = read(abs);
                for (const m of source.matchAll(/super\([^)]*'([A-Z][A-Z0-9_]{2,})'\)/g)) codes.add(m[1]);
                for (const m of source.matchAll(/code\s*[:=]\s*'([A-Z][A-Z0-9_]{2,})'/g)) codes.add(m[1]);
            }
        }
    };
    walk(SRC);
    return codes;
};

const openapi = read(OPENAPI);
const apiMd = read(API_MD);

const fail = [];
for (const route of scanRouteFiles()) {
    const full = (BASE + (route === '/' ? '' : route)).replace(/\/+$/, '');
    if (!openapi.includes(`${full}:`)) {
        fail.push(`Rota sem entrada em openapi.yaml: ${full}`);
    }
}
for (const code of collectErrorCodes()) {
    if (!apiMd.includes(code)) fail.push(`Código de erro sem entrada em API.md: ${code}`);
}

if (fail.length) {
    console.error('check-docs: documentação desalinhada do código:\n' + fail.join('\n'));
    process.exit(1);
}
console.log('check-docs: rotas e códigos de erro alinhados com API.md/openapi.yaml.');
