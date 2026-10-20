# Implementação de design a partir do Figma

Este guia descreve o workflow para reproduzir os frames do Figma no frontend
com precisão de pixels, com qualquer modelo/agento de AI. O servidor MCP é
agnóstico do modelo: o contexto vem das três fontes abaixo.

## Fontes de verdade

Combina as três — cada uma cobre o que as outras não apanham:

| Fonte | O que dá ao modelo |
| --- | --- |
| Figma MCP (dados do nó) | Valores exatos: tamanhos, spacing, cores, fontes, auto-layout |
| PNG de referência do mesmo frame | A intenção visual que os dados não transmitem (sobreposições, imagens, feel) |
| SVG/imagens exportadas em `public/` | Assets reais, para nada ser redesenhado ou adivinhado |

## Regras de implementação

- Usa os valores exatos dos dados do nó Figma. Sem arredondar, sem cores
  "aproximadas".
- Nunca inventes assets. Se falta um asset, para e pede a exportação.
- Define cores, tamanhos de fonte, spacing e raios primeiro como tokens
  (Tailwind theme em `globals.css`), e depois usa só os tokens. Consulta
  `/kit` para a escala existente.
- Sem gradientes a menos que os dados do Figma contenham um.
- Constrói uma secção de cada vez, pela ordem da página.
- Após cada secção, corre `npm run compare -- <frame> <largura>` e corrige
  todas as diferenças visíveis antes de avançar.

Preenche e mantém a secção seguinte quando o projeto tiver um ficheiro Figma:

## Tokens de design

<!-- Preencher por projeto: famílias e pesos de fonte, paleta de cores,
     escala de spacing, raios, breakpoints. -->

## Loop de comparação visual

1. No Figma, exporta o frame como PNG @2x para `frontend/design/`
   (ex.: `frontend/design/home.png`) e os ícones/imagens para `public/`.
2. Arranca o dev server (`npm run dev` no `frontend/`).
3. Corre a comparação:

   ```bash
   cd frontend
   npm run compare -- home 1440
   ```

4. Lê `design/out/home-diff.png` (as diferenças ficam a vermelho) e corrige.
5. Repete até a diferença ser aceitável. Junction de 1–3% é normal por
   anti-aliasing de fontes e scaling de imagens — julga pela imagem de diff,
   não só pelo número.

O script usa Playwright (`npm run compare` → `scripts/compare.mjs`) e funciona
com qualquer agente que saiba correr comandos e ler imagens: o agente corre o
compare, vê o diff e itera sozinho. Se o browser ainda não estiver no disco,
usa `npx playwright install chromium` (uma vez por máquina/CI).

## Registo do Figma MCP

O servidor Framelink (`figma-developer-mcp`) precisa de um token pessoal
Figma. **Nunca o commits** — a fonte única é a shell: `export
FIGMA_API_KEY=figd_xxx` em `~/.zshenv`/`~/.profile`, e todos os clientes MCP
herdam sem campo `env` nas configs (detalhes em
`tools/mcp-context/README.md`, secção "Figma"). Os `.env*` do frontend não
servem: só o Next os carrega.

## Workflow com um agente

Para cada frame (ou secção de um frame comprido):

1. Fornece o link "Copy link to selection" do Figma e o PNG @2x anexado.
2. Prompt:

   ```
   Build the Home frame from this Figma link, matching the attached
   screenshot exactly. Use only assets in public/. Follow AGENTS.md.
   When done, start the dev server, run `npm run compare -- home 1440`,
   read design/out/home-diff.png, and fix the differences. Repeat until
   the mismatch is under 2%.
   ```

3. Usa um modelo com visão (para ler o diff). Prime desktop, depois tablet e
   mobile com as respetivas larguras.
