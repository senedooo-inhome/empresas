# Deploy na Vercel

## Variáveis obrigatórias
Configure em Vercel > Project > Settings > Environment Variables:

- SUPABASE_URL=https://SEU-PROJETO.supabase.co
- SUPABASE_SERVICE_ROLE_KEY= SUA SERVICE ROLE KEY (somente backend)
- SUPABASE_ANON_KEY= SUA ANON KEY
- JWT_SECRET= uma chave secreta forte e estável
- GOOGLE_SHEETS_ID= ID da planilha
- GOOGLE_SERVICE_ACCOUNT_EMAIL= e-mail da conta de serviço do Google
- GOOGLE_PRIVATE_KEY= chave privada da conta de serviço (com os \n)

Veja o passo a passo completo em LEIA-ME_GOOGLE_SHEETS.md.

Aplique às environments Production, Preview e Development se você usa todas elas.
Depois de alterar qualquer variável, faça um novo Redeploy.

## Teste rápido
1. Abra `/api/teste` no domínio publicado.
2. O esperado é JSON com `ok: true` e `googleSheets` mostrando as abas.
3. Faça login normalmente.
4. Em Network, `/api/auth/login` deve retornar 200.
5. Depois, `/api/auth/me` deve retornar 200.

## Segurança
Nunca coloque SUPABASE_SERVICE_ROLE_KEY nem GOOGLE_PRIVATE_KEY em VITE_* nem no frontend.
