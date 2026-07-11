# Alypay — Fatura da Vergonha™

App de acompanhamento de dívida de cartão de crédito emprestado a dois
primos, com compras parceladas. Frontend estático (`index.html` único,
sem build), backend em Supabase (Postgres) acessado só através de
Cloudflare Pages Functions — o navegador nunca fala com o Supabase
diretamente, então um primo **nunca** consegue ver dados do outro, mesmo
mexendo no DevTools.

- **Painel admin** (`/admin`, protegido por senha): vê e edita os dois primos.
- **Link do primo** (`/?t=<token>`): só leitura, só os dados daquele primo.

## 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta (dá pra
   usar login do GitHub).
2. **New Project** → escolha um nome (ex: `alypay`), uma senha de banco
   (guarde, mas não é usada por este app) e a região mais próxima.
3. Espere o projeto provisionar (1-2 minutos).
4. No menu lateral, vá em **SQL Editor** → **New query**.
5. Cole o conteúdo inteiro do arquivo [`schema.sql`](./schema.sql) deste
   repositório e clique em **Run**. Isso cria as 3 tabelas, ativa RLS e
   já insere os dois primos (`Primo 1` e `Primo 2` — renomeie depois
   pelo próprio painel admin).
6. Vá em **Project Settings → API**. Você vai precisar de dois valores:
   - **Project URL** (ex: `https://xxxxx.supabase.co`) → `SUPABASE_URL`
   - **service_role key** (na seção "Project API keys", **não** a
     `anon`/`public`) → `SUPABASE_SERVICE_ROLE_KEY`

   ⚠️ A `service_role` key ignora todas as regras de segurança do banco —
   é por isso que ela só pode existir como secret no Cloudflare Pages
   (nas Functions), nunca no código do frontend nem em nenhum lugar que
   o navegador acesse.

## 2. Variáveis de ambiente necessárias

| Variável | Onde pegar | Uso |
|---|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API | Functions conversam com o banco |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | Idem — nunca exposta ao navegador |
| `ADMIN_PASSWORD` | Você escolhe | Senha do painel `/admin` |

## 3. Rodando local pra testar

Precisa do [Node.js](https://nodejs.org) instalado. O Cloudflare tem uma
CLI (`wrangler`) que roda tanto o site estático quanto as Functions
localmente, simulando o ambiente de produção.

1. Na raiz do projeto, crie um arquivo `.dev.vars` (já está no
   `.gitignore`, não vai pro git) com:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=coloque-a-service-role-key-aqui
   ADMIN_PASSWORD=escolha-uma-senha
   ```
2. Rode:
   ```bash
   npx wrangler pages dev .
   ```
3. Abre no navegador:
   - **Admin**: `http://localhost:8788/admin` (login com `ADMIN_PASSWORD`)
   - **Primo**: `http://localhost:8788/?t=<token_acesso>` — pegue o token
     de cada primo dentro do próprio painel admin (botão "🔗 Copiar link"
     em cada cartão) ou direto no Supabase (Table Editor → `primos`).

## 4. Deploy no Cloudflare Pages

1. Suba este projeto pro GitHub (branch `claude/alypay-cartao-primos`
   já está pronta).
2. No [dashboard do Cloudflare](https://dash.cloudflare.com) → **Workers
   & Pages** → **Create** → **Pages** → **Connect to Git** → selecione o
   repositório e essa branch.
3. Configuração de build:
   - **Build command**: (deixe em branco — não tem build)
   - **Build output directory**: `/`
4. Antes de fazer o deploy, adiciona as 3 variáveis de ambiente
   (**Settings → Environment variables**, tanto em Production quanto
   Preview se quiser testar PRs): `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD` — os mesmos valores do
   `.dev.vars`.
5. Deploy. A URL final fica tipo `https://alypay.pages.dev` (ou um
   domínio customizado se configurar depois).

Se preferir CLI em vez do dashboard:
```bash
npx wrangler pages deploy . --project-name=alypay
```
(a CLI também pede pra configurar as env vars via `wrangler pages secret put`
ou pelo dashboard depois do primeiro deploy).

## Estrutura do projeto

```
index.html                     # frontend único: admin + vista do primo
schema.sql                     # schema do Supabase (tabelas + RLS)
_redirects                     # roteamento SPA do Cloudflare Pages
functions/
  api/primo.js                  # GET  /api/primo?t=<token>   (público, isolado por token)
  api/admin/login.js             # POST /api/admin/login
  api/admin/data.js               # GET  /api/admin/data       (senha obrigatória)
  api/admin/compra.js              # POST /api/admin/compra
  api/admin/compra/[id].js          # DELETE /api/admin/compra/:id
  api/admin/pagamento.js             # POST /api/admin/pagamento
  api/admin/pagamento/[id].js         # DELETE /api/admin/pagamento/:id
  api/admin/primo/[id].js              # PATCH /api/admin/primo/:id (renomear / trocar token)
  api/admin/import.js                   # POST /api/admin/import (restaurar backup)
  _shared/supabase.js                    # cliente REST do Supabase (service_role)
  _shared/auth.js                         # validação da senha de admin
```

## Como funciona o isolamento entre primos

- O Supabase tem **RLS ligado e nenhuma policy** nas 3 tabelas — isso
  nega qualquer acesso via chave pública (`anon`), sem exceção.
- O navegador **nunca** recebe nem usa a `service_role key` — ela só
  existe como secret dentro das Cloudflare Functions.
- `GET /api/primo?t=<token>` busca o primo dono daquele token e retorna
  só os dados dele. Token inválido ou de outro formato sempre recebe o
  mesmo erro genérico (`Link inválido.`) — nunca revela se "quase" bateu
  ou detalhe de outro primo.
- Todas as rotas `/api/admin/*` exigem o header `X-Admin-Password`
  batendo com o secret `ADMIN_PASSWORD`, comparado com
  `timingSafeEqual` pra evitar timing attack.

## Backup

O botão **"💾 Exportar backup"** no painel admin baixa um JSON com tudo
(`primos`, `compras`, `pagamentos`). **"📥 Importar backup"** restaura
esse JSON no mesmo projeto Supabase (faz upsert por `id`, não duplica).
