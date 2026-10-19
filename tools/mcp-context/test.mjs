import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'server.mjs');

function createClient() {
    const child = spawn(process.execPath, [SERVER], { stdio: ['pipe', 'pipe', 'pipe'] });
    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
    const pending = new Map();
    let nextId = 0;
    let stderr = '';

    child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
    });

    lines.on('line', (line) => {
        let message;
        try {
            message = JSON.parse(line);
        } catch {
            return;
        }

        if (message.id !== undefined && pending.has(message.id)) {
            const { resolve } = pending.get(message.id);
            pending.delete(message.id);
            resolve(message);
        }
    });

    const request = (method, params) =>
        new Promise((resolve, reject) => {
            const id = ++nextId;
            const timer = setTimeout(() => {
                pending.delete(id);
                reject(new Error(`Timeout waiting for ${method}`));
            }, 5000);

            pending.set(id, {
                resolve: (message) => {
                    clearTimeout(timer);
                    resolve(message);
                },
            });

            child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
        });

    const notify = (method, params) => {
        child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
    };

    return { child, request, notify, stderr: () => stderr };
}

test('project-context MCP server', async (t) => {
    const client = createClient();
    t.after(() => client.child.kill());

    const init = await client.request('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'project-context-test', version: '1.0.0' },
    });
    assert.equal(init.result.serverInfo.name, 'project-context');
    assert.ok(init.result.capabilities.tools);
    assert.ok(init.result.capabilities.resources);
    assert.ok(init.result.capabilities.prompts);

    client.notify('notifications/initialized');

    const tools = await client.request('tools/list');
    const toolNames = tools.result.tools.map((tool) => tool.name);
    for (const name of ['project_overview', 'get_rules', 'list_docs', 'read_doc', 'search_docs']) {
        assert.ok(toolNames.includes(name), `missing tool ${name}`);
    }
    assert.ok(tools.result.tools.every((tool) => tool.annotations?.readOnlyHint === true));

    const overview = await client.request('tools/call', { name: 'project_overview', arguments: {} });
    assert.equal(overview.result.isError, false);
    assert.match(overview.result.content[0].text, /Express 5/);

    const read = await client.request('tools/call', { name: 'read_doc', arguments: { doc: 'agents' } });
    assert.equal(read.result.isError, false);
    assert.match(read.result.content[0].text, /# AGENTS\.md/);

    const blocked = await client.request('tools/call', { name: 'read_doc', arguments: { doc: '../.env' } });
    assert.equal(blocked.result.isError, true);

    const search = await client.request('tools/call', {
        name: 'search_docs',
        arguments: { query: 'refresh', max_results: 3 },
    });
    assert.equal(search.result.isError, false);
    assert.match(search.result.content[0].text, /refresh/i);

    const resources = await client.request('resources/list');
    assert.ok(resources.result.resources.some((resource) => resource.uri === 'project://architecture'));

    const templates = await client.request('resources/templates/list');
    assert.deepEqual(templates.result.resourceTemplates, []);

    const resource = await client.request('resources/read', { uri: 'project://architecture' });
    assert.match(resource.result.contents[0].text, /Arquitetura|Architecture/i);

    const prompts = await client.request('prompts/list');
    assert.ok(prompts.result.prompts.some((prompt) => prompt.name === 'implement_feature'));

    const prompt = await client.request('prompts/get', {
        name: 'implement_feature',
        arguments: { description: 'Add a health endpoint' },
    });
    assert.match(prompt.result.messages[0].content.text, /health endpoint/);

    const unknown = await client.request('tools/call', { name: 'nope', arguments: {} });
    assert.equal(unknown.result.isError, true);

    assert.equal(client.stderr(), '');
});
