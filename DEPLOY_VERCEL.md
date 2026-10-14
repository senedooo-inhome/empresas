# Deploy na Vercel

## Variáveis obrigatórias
Configure em Vercel > Project > Settings > Environment Variables:

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

## Segurança
Nunca coloque GOOGLE_PRIVATE_KEY nem JWT_SECRET em VITE_* nem no frontend.
