# Atualização — Cadastro de Agentes e Ciência de Recados

## Ordem correta para aplicar
1. No Supabase > SQL Editor, execute `MIGRACAO_AGENTES_RECADOS_CIENCIA.sql` uma única vez.
2. No VS Code, execute `npm install` caso ainda não tenha as dependências instaladas.
3. Rode `npm run dev` para testar localmente ou publique normalmente no Vercel.

## O que foi implementado
- Cadastro exclusivo da supervisão para agentes.
- Login do agente usando o nome cadastrado + senha.
- Código Sonax padrão `26253`.
- Nichos SAC, Clínicas e SAC & Clínica.
- Recados por período (data inicial e final).
- Dashboard da supervisão com acessos do dia e pendências de leitura/ciência.
- Recados vigentes na tela inicial do agente, com confirmação individual.
- Bloqueio dos links da empresa enquanto houver recado pendente.
- Quando um recado é editado, a confirmação anterior deixa de liberar o acesso e o agente deve clicar em “Estou ciente da atualização”.
- Registros de acesso e confirmações persistidos no Supabase.

## Vercel
Nenhuma configuração do Vercel foi alterada.
