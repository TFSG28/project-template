#!/usr/bin/env node
/**
 * project-context — read-only MCP server over stdio.
 *
 * Zero runtime dependencies. It exposes the repository's canonical documents as
 * MCP resources plus a few tools, so any MCP-capable editor/agent (OpenCode,
 * VS Code/Copilot, Claude Code, Cursor, Cline, Roo Code, Continue, a custom
 * DeepSeek extension, …) can load the same project context.
 *
 * Only files in the DOCS allowlist are readable. There is no network access and
 * no access to .env, uploads, logs or generated files.
 */
import { createInterface } from 'node:readline';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SERVER_NAME = 'project-context';
const SERVER_VERSION = '1.0.0';

const DOCS = Object.freeze([
    { key: 'agents', path: 'AGENTS.md', mimeType: 'text/markdown', description: 'Regras operacionais para agentes (fonte de verdade)' },
    { key: 'knowledge', path: 'knowledge.md', mimeType: 'text/markdown', description: 'Convenções completas e filosofia Ponytail' },
    { key: 'architecture', path: 'ARCHITECTURE.md', mimeType: 'text/markdown', description: 'Arquitetura, módulos, auth, SSE e design system' },
    { key: 'api', path: 'API.md', mimeType: 'text/markdown', description: 'Contrato HTTP: endpoints, cookies, erros e limites' },
    { key: 'openapi', path: 'docs/openapi.yaml', mimeType: 'application/yaml', description: 'Especificação OpenAPI' },
    { key: 'setup', path: 'SETUP.md', mimeType: 'text/markdown', description: 'Setup local e variáveis de ambiente' },
    { key: 'deployment', path: 'DEPLOYMENT.md', mimeType: 'text/markdown', description: 'Deploy manual, Docker, HTTPS e proxy' },
    { key: 'runbook', path: 'docs/runbook.md', mimeType: 'text/markdown', description: 'Operação, backups, health checks e SSE atrás de proxy' },
    { key: 'testing', path: 'TESTING.md', mimeType: 'text/markdown', description: 'Testes unitários, integração e e2e' },
    { key: 'security', path: 'SECURITY.md', mimeType: 'text/markdown', description: 'Política de segurança e reporte de vulnerabilidades' },
    { key: 'module-template', path: 'backend/MODULE_TEMPLATE.md', mimeType: 'text/markdown', description: 'Passos para criar um módulo backend' },
    { key: 'checklist', path: 'CHECKLIST.md', mimeType: 'text/markdown', description: 'Checklist de qualidade antes de entregar' },
    { key: 'contributing', path: 'CONTRIBUTING.md', mimeType: 'text/markdown', description: 'Fluxo de contribuição e standards' },
    { key: 'readme', path: 'README.md', mimeType: 'text/markdown', description: 'Visão geral e quick start' },
    { key: 'improvements', path: 'IMPROVEMENTS.md', mimeType: 'text/markdown', description: 'Melhorias implementadas e notas de evolução' },
    { key: 'changelog', path: 'CHANGELOG.md', mimeType: 'text/markdown', description: 'Histórico de alterações' },
]);

const DOCS_BY_KEY = new Map(DOCS.map((doc) => [doc.key, doc]));

const READ_ONLY = Object.freeze({
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
});

const OVERVIEW = `# project-template

Template full-stack production-ready.

## Stack

- Backend: Express 5, TypeScript, Prisma 7 + MySQL, TSyringe, Zod, Pino.
- Frontend: Next.js 16 (App Router), React 19, Tailwind CSS 4.
- Auth: cookies httpOnly (access 15 min + refresh opaco rotativo 7 dias) e CSRF
  double-submit.
- Realtime: SSE in-process, heartbeat de 25 s.
- Storage: local, nomes UUID, allowlist de extensões e anti-path-traversal.
- Observability: Pino, Prometheus, health checks e correlação de pedidos.

## Comandos

- Backend: \`cd backend && npm run build\` (prisma generate → testes → lint →
  tsc → postbuild). \`npm test\`, \`npm run lint\`, \`npm run db-update\`.
- Frontend: \`cd frontend && npm run build\`, \`npm test\`, \`npm run lint\`.
- Node 24+.

## Regras críticas

- Clean Architecture por módulo; mudanças cirúrgicas; sem abstrações
  especulativas.
- Nunca Bearer/localStorage: auth por cookies httpOnly + CSRF.
- Todo o HTTP do frontend passa por \`fetchClient\`; SSE só por \`useSseStream\`.
- Prisma é gerado em \`src/generated/prisma\`; nunca importar \`@prisma/client\`.
- Nunca commitar segredos, \`.env\`, artefactos gerados ou estado local.

## Documentos

Use \`list_docs\` para a lista completa, \`read_doc\` para ler um documento e
\`search_docs\` para procurar. \`get_rules\` devolve \`AGENTS.md\` + \`knowledge.md\`.
`;

const TOOLS = Object.freeze([
    {
        name: 'project_overview',
        description: 'Resumo compacto do stack, comandos e regras críticas. Bom para o prompt inicial de uma extensão.',
        annotations: READ_ONLY,
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
        name: 'get_rules',
        description: 'Devolve AGENTS.md + knowledge.md (regras operacionais e convenções completas).',
        annotations: READ_ONLY,
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
        name: 'list_docs',
        description: 'Lista os documentos disponíveis, com chave, caminho, descrição e tamanho.',
        annotations: READ_ONLY,
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
        name: 'read_doc',
        description: 'Lê um documento da allowlist. Usa list_docs para descobrir as chaves.',
        annotations: READ_ONLY,
        inputSchema: {
            type: 'object',
            properties: {
                doc: {
                    type: 'string',
                    enum: DOCS.map((doc) => doc.key),
                    description: 'Chave do documento (ex.: agents, architecture, api).',
                },
            },
            required: ['doc'],
            additionalProperties: false,
        },
    },
    {
        name: 'search_docs',
        description: 'Procura texto nos documentos da allowlist e devolve snippets com ficheiro e linha.',
        annotations: READ_ONLY,
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', minLength: 2, description: 'Termos a procurar.' },
                max_results: { type: 'integer', minimum: 1, maximum: 20, description: 'Máximo de resultados (default 8).' },
            },
            required: ['query'],
            additionalProperties: false,
        },
    },
]);

const PROMPTS = Object.freeze([
    {
        name: 'implement_feature',
        description: 'Implementa uma feature seguindo AGENTS.md, knowledge.md e a Definition of Done.',
        arguments: [{ name: 'description', description: 'O que deve ser implementado.', required: true }],
        build: ({ description }) => `Implementa a seguinte feature neste repositório:

${description}

Antes de escrever código:
1. Lê project://agents e project://knowledge (ou chama get_rules).
2. Identifica o módulo/rota/componente correto e segue a Clean Architecture.
3. Mantém o diff cirúrgico; não refactorizes código adjacente.
4. Respeita cookies httpOnly + CSRF, fetchClient/useSseStream e os design tokens.
5. No fim, corre os builds/testes da Definition of Done e atualiza os docs de contrato se necessário.`,
    },
    {
        name: 'review_change',
        description: 'Revê alterações contra arquitetura, segurança, testes e docs.',
        arguments: [{ name: 'scope', description: 'Ficheiros, commit ou âmbito a rever.', required: false }],
        build: ({ scope = 'as alterações atuais' }) => `Revê ${scope} neste repositório.

Verifica:
- Clean Architecture e limites entre Domain/Application/Infrastructure/Presentation.
- Auth por cookies httpOnly + CSRF; refresh rotativo; nenhum token em localStorage.
- Frontend: fetchClient/useSseStream, design tokens, Suspense e acessibilidade.
- Prisma: import correto, índices e migrações; sem campos encriptados em lookups sem blind index.
- Testes para lógica não trivial e builds verdes.
- Sem segredos, artefactos gerados ou mudanças fora do âmbito.
Apresenta achados por severidade (P0-P3) e um plano de correção.`,
    },
    {
        name: 'new_module',
        description: 'Cria um módulo backend completo seguindo o MODULE_TEMPLATE.',
        arguments: [
            { name: 'name', description: 'Nome do módulo (ex.: billing).', required: true },
            { name: 'purpose', description: 'Responsabilidade do módulo.', required: true },
        ],
        build: ({ name, purpose }) => `Cria o módulo backend \`${name}\` para: ${purpose}.

Lê project://module-template e project://architecture. Inclui:
- domain (entity, repository interface, errors/services quando necessário);
- application (DTOs + use cases);
- infrastructure (repositório Prisma);
- presentation (controller + rotas finas com validate/auth/csrf quando aplicável);
- bindings em shared/container (tokens, módulo e controllers);
- schema Prisma/migração se houver persistência;
- testes unitários dos use cases e, se houver rota, um teste da rota.
Não adiciones dependências novas sem justificação.`,
    },
]);

function result(id, value) {
    return { jsonrpc: '2.0', id, result: value };
}

function error(id, code, message, data) {
    const payload = { code, message };
    if (data !== undefined) payload.data = data;
    return { jsonrpc: '2.0', id, error: payload };
}

function send(message) {
    process.stdout.write(`${JSON.stringify(message)}\n`);
}

function docFor(key) {
    const doc = DOCS_BY_KEY.get(key);
    if (!doc) {
        throw new Error(`Documento desconhecido "${key}". Usa list_docs para ver as chaves válidas.`);
    }
    return doc;
}

async function readDoc(key) {
    const doc = docFor(key);
    const text = await readFile(path.join(ROOT, doc.path), 'utf8');
    return { doc, text };
}

async function getRules() {
    const [agents, knowledge] = await Promise.all([readDoc('agents'), readDoc('knowledge')]);
    return `${agents.text}\n\n---\n\n${knowledge.text}`;
}

async function listDocs() {
    const lines = ['# Documentos disponíveis', ''];
    for (const doc of DOCS) {
        let size = 'em falta';
        try {
            const info = await stat(path.join(ROOT, doc.path));
            size = `${info.size} bytes`;
        } catch {
            // Keep "em falta" — useful when a doc is renamed.
        }
        lines.push(`- \`${doc.key}\` — \`${doc.path}\` (${doc.description}; ${size})`);
    }
    return lines.join('\n');
}

async function searchDocs(query, maxResults = 8) {
    if (typeof query !== 'string' || query.trim().length < 2) {
        throw new Error('search_docs precisa de "query" com pelo menos 2 caracteres.');
    }

    const terms = query
        .toLowerCase()
        .split(/\s+/)
        .filter((term) => term.length >= 2);

    const results = [];
    for (const doc of DOCS) {
        let text;
        try {
            text = await readFile(path.join(ROOT, doc.path), 'utf8');
        } catch {
            continue;
        }

        const lines = text.split(/\r?\n/);
        for (let index = 0; index < lines.length; index += 1) {
            const lower = lines[index].toLowerCase();
            let score = 0;
            for (const term of terms) {
                let cursor = 0;
                while ((cursor = lower.indexOf(term, cursor)) !== -1) {
                    score += 1;
                    cursor += term.length;
                }
            }

            if (score > 0) {
                results.push({
                    doc,
                    line: index + 1,
                    text: lines[index].trim().slice(0, 280),
                    score,
                });
            }
        }
    }

    results.sort((a, b) => b.score - a.score || a.doc.key.localeCompare(b.doc.key) || a.line - b.line);
    const limit = Math.min(Math.max(Number(maxResults) || 8, 1), 20);
    const top = results.slice(0, limit);

    if (top.length === 0) {
        return `Sem resultados para ${JSON.stringify(query)}.`;
    }

    return [
        `# Resultados para ${JSON.stringify(query)}`,
        '',
        ...top.map((entry) => `## ${entry.doc.path}:${entry.line}\n${entry.text}`),
    ].join('\n');
}

async function callTool(name, args = {}) {
    switch (name) {
        case 'project_overview':
            return OVERVIEW;
        case 'get_rules':
            return getRules();
        case 'list_docs':
            return listDocs();
        case 'read_doc': {
            if (typeof args.doc !== 'string') {
                throw new Error('read_doc precisa de "doc" (string).');
            }
            const { text } = await readDoc(args.doc);
            return text;
        }
        case 'search_docs':
            return searchDocs(args.query, args.max_results);
        default:
            throw new Error(`Ferramenta desconhecida "${name}".`);
    }
}

async function handle(message) {
    if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
        return error(message?.id ?? null, -32600, 'Invalid Request');
    }

    const { id, method, params = {} } = message;

    // Notifications (no id) never receive a response.
    if (id === undefined) {
        if (method === 'exit') {
            process.exit(0);
        }
        return null;
    }

    try {
        switch (method) {
            case 'initialize':
                return result(id, {
                    protocolVersion: typeof params.protocolVersion === 'string' ? params.protocolVersion : '2025-06-18',
                    capabilities: {
                        tools: { listChanged: false },
                        resources: { subscribe: false, listChanged: false },
                        prompts: { listChanged: false },
                    },
                    serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
                    instructions:
                        'Contexto read-only do project-template. Lê project://agents primeiro. ' +
                        'Usa project_overview para um resumo, list_docs/read_doc/search_docs para detalhe.',
                });

            case 'ping':
                return result(id, {});

            case 'shutdown':
                return result(id, null);

            case 'tools/list':
                return result(id, { tools: TOOLS });

            case 'tools/call': {
                const { name, arguments: toolArgs = {} } = params;
                try {
                    const text = await callTool(name, toolArgs);
                    return result(id, { content: [{ type: 'text', text }], isError: false });
                } catch (toolError) {
                    return result(id, {
                        content: [{ type: 'text', text: toolError instanceof Error ? toolError.message : String(toolError) }],
                        isError: true,
                    });
                }
            }

            case 'resources/list':
                return result(id, {
                    resources: DOCS.map((doc) => ({
                        uri: `project://${doc.key}`,
                        name: doc.path,
                        description: doc.description,
                        mimeType: doc.mimeType,
                    })),
                });

            case 'resources/templates/list':
                return result(id, { resourceTemplates: [] });

            case 'resources/read': {
                const uri = typeof params.uri === 'string' ? params.uri : '';
                if (!uri.startsWith('project://')) {
                    return error(id, -32602, `URI inválido "${uri}". Usa project://<chave>.`);
                }

                const key = decodeURIComponent(uri.slice('project://'.length)).replace(/\/+$/, '');
                try {
                    const { doc, text } = await readDoc(key);
                    return result(id, {
                        contents: [{ uri, mimeType: doc.mimeType, text }],
                    });
                } catch (readError) {
                    return error(id, -32602, readError instanceof Error ? readError.message : String(readError));
                }
            }

            case 'prompts/list':
                return result(id, {
                    prompts: PROMPTS.map(({ name, description, arguments: promptArguments }) => ({
                        name,
                        description,
                        arguments: promptArguments,
                    })),
                });

            case 'prompts/get': {
                const prompt = PROMPTS.find((entry) => entry.name === params.name);
                if (!prompt) {
                    return error(id, -32602, `Prompt desconhecido "${params.name}".`);
                }

                const provided = params.arguments ?? {};
                const missing = prompt.arguments
                    .filter((argument) => argument.required && !provided[argument.name])
                    .map((argument) => argument.name);

                if (missing.length > 0) {
                    return error(id, -32602, `Faltam argumentos: ${missing.join(', ')}.`);
                }

                return result(id, {
                    description: prompt.description,
                    messages: [{ role: 'user', content: { type: 'text', text: prompt.build(provided) } }],
                });
            }

            default:
                return error(id, -32601, `Method not found: ${method}`);
        }
    } catch (handlerError) {
        return error(id, -32603, 'Internal error', handlerError instanceof Error ? handlerError.message : String(handlerError));
    }
}

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });

lines.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let message;
    try {
        message = JSON.parse(trimmed);
    } catch {
        send(error(null, -32700, 'Parse error'));
        return;
    }

    void handle(message)
        .then((response) => {
            if (response) send(response);
        })
        .catch((handlerError) => {
            send(error(message?.id ?? null, -32603, 'Internal error', handlerError instanceof Error ? handlerError.message : String(handlerError)));
        });
});

process.on('uncaughtException', (uncaught) => {
    console.error(`[${SERVER_NAME}] uncaught exception`, uncaught);
    process.exit(1);
});

process.on('unhandledRejection', (rejection) => {
    console.error(`[${SERVER_NAME}] unhandled rejection`, rejection);
    process.exit(1);
});
