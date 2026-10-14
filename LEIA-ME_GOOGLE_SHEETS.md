# Portal Sonax: tudo no Google Sheets

Nesta versão, o portal **não usa mais o Supabase**. Logins, empresas, recados, acessos e confirmações de leitura ficam todos em uma planilha do Google Sheets. O servidor local (`npm run dev`) e a Vercel usam o mesmo código da pasta `api/`.

A planilha tem 5 abas, que o sistema cria sozinho na primeira vez que roda:

| Aba | O que guarda |
|---|---|
| `usuarios` | Supervisão e agentes. A senha fica só como hash criptografado (`password_hash`), nunca em texto. |
| `empresas` | Empresas atendidas (links em JSON, `ativo` = TRUE/FALSE) |
| `recados` | Recados com período (`data_inicio` e `data_fim` no formato AAAA-MM-DD) |
| `agente_acessos` | Um registro por login de agente |
| `recados_leituras` | Confirmações de leitura dos recados |

> Dá para consultar e corrigir dados direto na planilha. Só não renomeie as abas nem os títulos da linha 1, não apague a coluna `id` e não mexa em `password_hash`. Para trocar senha, use o portal ou o comando `npm run senha`.
>
> **Compartilhe a planilha só com a conta de serviço e com quem precisa.** Quem abre a planilha consegue editar usuários e recados.

---

## Passo 1: criar a planilha

1. Acesse https://sheets.google.com e crie uma planilha em branco, por exemplo **"Portal Sonax - Dados"**.
2. Copie o **ID**, que é o trecho do link entre `/d/` e `/edit`.

## Passo 2: criar a conta de serviço do Google (uma vez só)

1. Acesse https://console.cloud.google.com e crie ou selecione o projeto do portal (por exemplo, `portal-sonax`).
2. Ative a **Google Sheets API**: https://console.cloud.google.com/apis/library/sheets.googleapis.com
3. Em https://console.cloud.google.com/iam-admin/serviceaccounts, clique em **Criar conta de serviço**, dê um nome e conclua. Não precisa dar nenhum papel.
4. Abra a conta, vá em **Chaves > Adicionar chave > Criar nova chave > JSON**. O arquivo será baixado na pasta Downloads.
5. Copie o **e-mail da conta de serviço** (termina com `@...iam.gserviceaccount.com`).

## Passo 3: compartilhar a planilha

Na planilha, clique em **Compartilhar**, cole o e-mail da conta de serviço e dê permissão de **Editor**.

## Passo 4: configurar o projeto no VSCode

1. Coloque o arquivo `.json` baixado na pasta do projeto (ao lado do `package.json`), com o nome `google-service-account.json`.
2. Copie `.env.example` para `.env.local` e preencha `JWT_SECRET` e `GOOGLE_SHEETS_ID`.
3. No terminal do VSCode:
   ```bash
   npm install
   npm run dev
   ```
4. Abra http://localhost:3000/api/teste. O esperado é `"ok": true` e as 5 abas aparecendo na planilha.

## Passo 5: trazer os dados do Supabase (exportando CSV)

Como o Supabase está bloqueado, os dados vêm por CSV exportado do painel dele.

1. Crie uma pasta chamada `migracao` dentro do projeto.
2. No painel do Supabase, em **Table Editor**, abra cada tabela e use **Export > Export to CSV**: `empresas`, `recados`, `agente_acessos` e `recados_leituras`. Salve os arquivos na pasta `migracao`. Pode manter o nome que o Supabase dá (ex.: `empresas_rows.csv`).
3. **Usuários com as senhas atuais:** no Supabase, abra o **SQL Editor**, rode a consulta abaixo e exporte o resultado como CSV com o nome `usuarios.csv`, também na pasta `migracao`:
   ```sql
   select u.id, u.auth_user_id, u.email, u.login, u.nome, u.role,
          a.encrypted_password as password_hash,
          u.ramal, u.codigo_sonax, u.nicho_agente, u.turno, u.ativo,
          u.created_at, u.updated_at
   from public.usuarios u
   left join auth.users a on a.id = u.auth_user_id;
   ```
   Assim todos continuam entrando com a **mesma senha de antes**.
4. Rode:
   ```bash
   npm run importar:csv
   ```
   Se as abas já tiverem dados, nada é alterado. Para apagar o conteúdo das abas e importar de novo, use `npm run importar:csv -- --substituir`.

> ⚠️ O arquivo `usuarios.csv` contém as senhas criptografadas. Não envie para ninguém e apague a pasta `migracao` depois da importação (ela já está no `.gitignore`).

### Se não conseguir exportar os usuários (ou ficou alguém sem senha)

Defina a senha pelo terminal:

```bash
# troca a senha de um usuário existente (por e-mail ou login)
npm run senha -- supervisao@sonax.net.br MinhaSenhaForte

# cria o usuário da supervisão, se a aba usuarios estiver vazia
npm run senha -- supervisao@sonax.net.br MinhaSenhaForte --criar-supervisao
```

Depois, a supervisão entra no portal e cadastra os agentes, ou define senhas novas para eles, pela tela de Agentes, como sempre.

## Passo 6 (se usar a Vercel): variáveis de ambiente

Em **Vercel > Project > Settings > Environment Variables**, deixe somente:

- `JWT_SECRET`
- `GOOGLE_SHEETS_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: o `client_email` do arquivo JSON
- `GOOGLE_PRIVATE_KEY`: o `private_key` do arquivo JSON, colado exatamente como está, com os `\n`

Pode apagar as variáveis `SUPABASE_*`. Depois clique em **Redeploy** e teste `/api/teste` no domínio publicado.

---

## Limites e cuidados

- **Velocidade:** cada gravação leva de meio a um segundo e meio. Para leitura, o servidor guarda a planilha em memória por 5 segundos (`SHEETS_CACHE_SECONDS`), então as telas atualizam com até ~5s de atraso.
- **Cota gratuita do Google:** 60 leituras por minuto. Com o cache, isso atende bem a uma equipe de algumas dezenas de pessoas. Se aparecer erro de limite, aumente `SHEETS_CACHE_SECONDS` para 10.
- **Volume:** funciona bem até dezenas de milhares de linhas. A aba `agente_acessos` cresce um pouco a cada login. De tempos em tempos, você pode apagar linhas antigas direto na planilha.
- **Logos:** as enviadas como arquivo são reduzidas automaticamente para caber numa célula. Logos antigas grandes demais ficam em branco na importação, e o comando avisa. É só enviar de novo pelo portal.
- **Gravações simultâneas:** no servidor local, as gravações entram em fila. Na Vercel, duas gravações exatamente ao mesmo tempo são raras, mas possíveis. Para uso interno, isso não costuma ser problema.
