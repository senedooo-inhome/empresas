# Correções — Login de Agentes e Recados

- Login de agente por nome + senha corrigido.
- Agentes antigos com e-mail técnico `@agentes.sonax.local` são migrados automaticamente para `@agentes.sonax.net.br` no primeiro login, preservando o mesmo usuário e senha no Supabase Auth.
- Novos agentes passam a usar `@agentes.sonax.net.br` internamente.
- Cadastro de recados alinhado às colunas `data_inicio`, `data_fim` e `data_recado` do Supabase.
- Mensagens de erro de recado agora exibem o detalhe retornado pela API.
- Servidor local (`npm run dev`) usa Supabase para empresas e recados quando as variáveis estão configuradas, ficando consistente com o Vercel.
- `vercel.json` não foi alterado.

Não inclua `.env.local` no Git. Copie o seu `.env.local` atual apenas para teste local.
