# project-context (MCP)

Servidor **MCP read-only** que expõe o contexto canónico deste repositório a
qualquer agente ou editor compatível com Model Context Protocol. É agnóstico ao
modelo: podes usá-lo com DeepSeek, Claude, GPT, Gemini, um modelo local, etc.

- Transporte: **stdio** (o cliente lança `node`).
- Dependências: **zero** (só Node 24+).
- Acesso: allowlist de documentos; não lê `.env`, uploads, logs, `dist`,
  `node_modules` nem ficheiros gerados.
- Rede: nenhuma.

## Porquê

`AGENTS.md` continua a ser a fonte de verdade. Este servidor serve o mesmo
contexto a ferramentas que não leem `AGENTS.md`, ou que preferem descobrir
documentos a pedido em vez de os carregar todos no prompt.

## Ferramentas

| Ferramenta | Para quê |
| --- | --- |
| `project_overview` | Resumo compacto do stack, comandos e regras críticas. |
| `get_rules` | `AGENTS.md` + `knowledge.md` completos. |
| `list_docs` | Lista documentos, caminhos e tamanhos. |
| `read_doc` | Lê um documento da allowlist (`agents`, `architecture`, `api`, …). |
| `search_docs` | Procura texto nos documentos e devolve snippets com linha. |

Também expõe recursos `project://agents`, `project://knowledge`,
`project://architecture`, `project://api`, `project://openapi`, etc., e prompts
(`implement_feature`, `review_change`, `new_module`).

## Correr e testar

```bash
# da raiz do repo
node tools/mcp-context/server.mjs

# testes do protocolo (spawn + JSON-RPC)
cd tools/mcp-context
npm test
```

O servidor fala JSON-RPC 2.0, uma mensagem por linha, em stdin/stdout. Não
escreve nada em stdout fora do protocolo; erros vão para stderr.

## OpenCode

Já está configurado em [`opencode.jsonc`](../../opencode.jsonc):

- `AGENTS.md` é lido nativamente;
- `knowledge.md` é carregado via `instructions`;
- o servidor MCP `project-context` é iniciado com `node`.

Para usar DeepSeek:

```bash
export DEEPSEEK_API_KEY="..."   # nunca commitar
opencode
# /models → DeepSeek V4 Flash (ou /connect → DeepSeek)
```

O ID do modelo no catálogo é `deepseek/deepseek-v4-flash` (também existe
`deepseek/deepseek-v4-pro`). Para o fixar, descomenta `"model"` em
`opencode.jsonc`.

## Claude Code / GitHub Copilot (VS Code)

O ficheiro [`.mcp.json`](../../.mcp.json) na raiz usa o formato portátil
(`mcpServers`) e é lido pelo Claude Code e pelo harness Copilot do VS Code.
Arranca o servidor a partir da raiz do workspace.

## Cursor

[`.cursor/mcp.json`](../../.cursor/mcp.json) já regista o servidor. O Cursor
também lê `.cursor/rules/project.mdc` para as regras estáticas.

## VS Code (formato nativo)

Se preferires o formato do VS Code (`.vscode/mcp.json`, topo `servers`), usa:

```json
{
  "servers": {
    "projectContext": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/tools/mcp-context/server.mjs"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

Não tenhas `.mcp.json` e `.vscode/mcp.json` ativos ao mesmo tempo no VS Code,
para não registares o servidor duas vezes.

## Windsurf

O Windsurf usa configuração global. Em
`~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "project-context": {
      "command": "node",
      "args": ["/caminho/absoluto/para/project-template/tools/mcp-context/server.mjs"]
    }
  }
}
```

## Cline / Roo Code / Continue / extensão própria

Qualquer cliente MCP com transporte stdio serve. Usa o caminho **absoluto**
para o servidor (as extensões não têm todas o mesmo working directory):

```json
{
  "mcpServers": {
    "project-context": {
      "command": "node",
      "args": ["/caminho/absoluto/para/project-template/tools/mcp-context/server.mjs"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

- **Cline / Roo Code:** MCP Servers → Configure MCP Servers → cola o JSON (a UI
  varia ligeiramente).
- **Continue:** em `config.yaml`:

  ```yaml
  mcpServers:
    - name: project-context
      command: node
      args:
        - /caminho/absoluto/para/project-template/tools/mcp-context/server.mjs
  ```

- **Extensão própria:** implementa o cliente MCP sobre stdio e lança o processo
  acima. O modelo (DeepSeek ou outro) é configurado na extensão; o servidor só
  fornece contexto.

### DeepSeek na extensão

1. Configura o provider DeepSeek na extensão e guarda a API key no secret
   storage da extensão (nunca no repositório).
2. Escolhe um modelo DeepSeek (ex.: V4 Flash) nas definições do agente.
3. Adiciona o servidor MCP `project-context` como acima.
4. Pede ao agente para começar por `project_overview` ou `get_rules`.

A API key não passa por este servidor e não é necessária para o MCP.

## Adicionar documentos

Edita o array `DOCS` em [`server.mjs`](./server.mjs). Cada entrada tem:

```js
{ key: 'meu-doc', path: 'docs/meu-doc.md', mimeType: 'text/markdown', description: '…' }
```

Mantém a allowlist explícita: não aceites caminhos arbitrários do cliente.
