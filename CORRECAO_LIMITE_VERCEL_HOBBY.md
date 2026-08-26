# Correção do limite de Serverless Functions do Vercel Hobby

Esta versão mantém as funcionalidades de agentes, dashboard da supervisão e confirmações de leitura, mas consolida essas três APIs em uma única função: `api/operacional.ts`.

## Alterações técnicas

- Removidos: `api/agentes/index.ts`, `api/dashboard/index.ts`, `api/recados/leituras.ts`.
- Adicionado: `api/operacional.ts`.
- O frontend agora usa:
  - `/api/operacional?action=agentes`
  - `/api/operacional?action=dashboard`
  - `/api/operacional?action=leituras`
- O servidor local (`server/routes.ts`) possui a mesma rota consolidada para manter o comportamento entre VS Code e Vercel.
- `vercel.json` não foi alterado.

## Resultado

A pasta `api` contém 12 arquivos TypeScript no total, incluindo o helper `_core.ts`, ficando dentro do limite informado pelo Vercel Hobby.

## Validação

`npm run lint` (TypeScript `tsc --noEmit`) foi executado com sucesso usando as dependências originais do projeto. O build Vite não pôde ser concluído neste ambiente Linux porque o `node_modules` original do Windows não contém o binário opcional Linux do Rollup. No Vercel, as dependências são instaladas para Linux durante o deploy.
