# Portal Sonax: dados no Google Sheets

A partir desta versão:

- **Login continua no Supabase**, do mesmo jeito que antes (tabela `usuarios` e Authentication > Users). Cadastrar, editar e excluir agentes também continua igual.
- **Empresas, recados, acessos dos agentes e confirmações de leitura** ficam em uma planilha do Google Sheets.
- O servidor local (`npm run dev`) e a Vercel usam o **mesmo código** da pasta `api/`.

A planilha tem 4 abas, que o sistema cria sozinho na primeira vez que roda:

| Aba | O que guarda |
|---|---|
| `empresas` | Empresas atendidas (links em JSON, `ativo` = TRUE/FALSE) |
| `recados` | Recados com período (`data_inicio` e `data_fim` no formato AAAA-MM-DD) |
| `agente_acessos` | Um registro por login de agente |
| `recados_leituras` | Confirmações de leitura dos recados pelos agentes |

> Dá para consultar e corrigir dados direto na planilha. Só não renomeie as abas nem os títulos da linha 1, e não apague a coluna `id`.

---

## Passo 1: criar a planilha

1. Acesse https://sheets.google.com e crie uma planilha em branco, por exemplo **"Portal Sonax - Dados"**.
2. Copie o **ID** dela, que é o trecho do link entre `/d/` e `/edit`:
   `https://docs.google.com/spreadsheets/d/`**`1AbCdEf...xyz`**`/edit`

## Passo 2: criar a conta de serviço do Google (uma vez só)

1. Acesse https://console.cloud.google.com e crie um projeto (por exemplo, "portal-sonax").
2. No menu **APIs e serviços > Biblioteca**, procure **Google Sheets API** e clique em **Ativar**.
3. Em **APIs e serviços > Credenciais**, clique em **Criar credenciais > Conta de serviço**. Dê um nome (por exemplo, "portal-sonax") e conclua. Não precisa dar nenhum papel.
4. Abra a conta de serviço criada, vá na aba **Chaves > Adicionar chave > Criar nova chave > JSON**. Um arquivo `.json` será baixado.
5. Copie o **e-mail da conta de serviço** (termina com `@...iam.gserviceaccount.com`).

## Passo 3: compartilhar a planilha com a conta de serviço

Na planilha, clique em **Compartilhar**, cole o e-mail da conta de serviço e dê permissão de **Editor**. Desmarque "Notificar".

> A planilha **não** precisa (e não deve) ficar pública. Compartilhe só com a conta de serviço e com quem da empresa precisa ver os dados.

## Passo 4: configurar o projeto no VSCode

1. Coloque o arquivo `.json` baixado na pasta do projeto com o nome `google-service-account.json` (ele já está no `.gitignore`).
2. Copie `.env.example` para `.env.local` e preencha:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (os mesmos de antes; se você trocou as chaves no Supabase, use as novas)
   - `JWT_SECRET`
   - `GOOGLE_SHEETS_ID` (Passo 1)
   - `GOOGLE_SERVICE_ACCOUNT_FILE=./google-service-account.json`
3. No terminal do VSCode:
   ```bash
   npm install
   npm run dev
   ```
4. Abra http://localhost:3000/api/teste. O esperado é `"ok": true` e a contagem de linhas de cada aba. As 4 abas aparecem na planilha.

## Passo 5: trazer os dados que já estão no Supabase

Com o `.env.local` configurado, rode **uma vez**:

```bash
npm run migrar:sheets
```

Ele copia empresas, recados, acessos e confirmações do Supabase para a planilha. Não apaga nada do Supabase e não mexe nos logins. Se as abas já tiverem dados, ele não faz nada. Para apagar o conteúdo das abas e copiar de novo, use `npm run migrar:sheets -- --substituir`.

> Logos enviadas como arquivo que forem grandes demais para uma célula da planilha (limite de 50 mil caracteres) ficam em branco, e o script avisa. Basta enviar a logo de novo pelo portal: agora a imagem é reduzida automaticamente antes de salvar.

## Passo 6 (se usar a Vercel): variáveis de ambiente

Em **Vercel > Project > Settings > Environment Variables**, adicione, além das do Supabase e `JWT_SECRET`:

- `GOOGLE_SHEETS_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: o `client_email` do arquivo JSON
- `GOOGLE_PRIVATE_KEY`: o `private_key` do arquivo JSON, colado exatamente como está, com os `\n` incluídos

Depois clique em **Redeploy** e teste `/api/teste` no domínio publicado.

---

## Limites e cuidados

- **Velocidade:** cada gravação leva de meio a um segundo e meio. Para leitura, o servidor guarda a planilha em memória por 5 segundos (`SHEETS_CACHE_SECONDS`), então as telas atualizam com até ~5s de atraso.
- **Cota gratuita do Google:** 60 leituras por minuto. Com o cache, isso atende bem a uma equipe de algumas dezenas de pessoas. Se aparecer erro de limite, aumente `SHEETS_CACHE_SECONDS` para 10.
- **Volume:** funciona bem até dezenas de milhares de linhas. A aba `agente_acessos` cresce um pouco a cada login. De tempos em tempos, você pode apagar linhas antigas direto na planilha.
- **Gravações simultâneas:** no servidor local, as gravações entram em fila. Na Vercel, duas gravações exatamente ao mesmo tempo são raras, mas possíveis. Para uso interno, isso não costuma ser problema.
- **Supabase gratuito:** o projeto do Supabase pausa depois de 7 dias sem uso. Como os logins acontecem todo dia, ele continua ativo.
