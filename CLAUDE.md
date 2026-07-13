# Alypay — Boletim Anti-Calote

Rastreador de dívida de cartão/empréstimos entre o Alysson (admin) e dois primos
(Xana e Vequinha), com tom cômico. SPA em `index.html` único (vanilla JS, sem
build) + Cloudflare Pages Functions + Supabase Postgres.

## Arquitetura

- `index.html` — todo o frontend (CSS + JS inline). Roteamento por URL:
  `/admin` (painel, senha), `/?t=<token>` (visão do primo), `/` (landing).
- `404.html` — **cópia byte a byte de `index.html`**. É o fallback SPA que
  funciona; `_redirects` com `/* /index.html 200` NÃO funciona (bug do wrangler
  detecta "infinite loop" e ignora a regra). Depois de QUALQUER edição em
  `index.html`, rodar `cp index.html 404.html`.
- `_routes.json` — limita Functions a `/api/*` (deixa estáticos com o 404.html).
- `functions/api/` — endpoints. `_shared/` tem `supabase.js` (client REST),
  `auth.js` (senha admin via header `X-Admin-Password`), `primo.js`
  (validação de token).
- `schema.sql` — schema completo (só para projeto novo; tem seed de primos que
  DUPLICA se rodado de novo). Migrações incrementais: arquivos
  `migration_*.sql`, rodados manualmente no SQL Editor do Supabase (PostgREST
  não executa DDL).

## Deploy (Cloudflare Pages)

```sh
# validar JS antes (extrai o <script> e compila):
node -e "new (require('vm').Script)(require('fs').readFileSync('index.html','utf8').match(/<script>([\s\S]*)<\/script>/)[1])" && echo OK
cp index.html 404.html
npx wrangler pages deploy . --project-name alypay --branch main --commit-dirty=true
```

- Precisa de `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` no ambiente
  (pedir ao usuário; não estão no repo).
- Produção: https://alypay.pages.dev — o alias demora ~5–20s pra refletir um
  deploy novo (lag de propagação; esperar e re-testar, não é bug).
- `--branch main` é obrigatório assim (o projeto Pages registrou `main` como
  production branch, independente do branch git real).
- Logo após deploy, POSTs podem dar 522/000 transitório — repetir.
- Secrets do runtime (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `ADMIN_PASSWORD`): `npx wrangler pages secret put <NOME> --project-name alypay`.
  Trocar secret exige um deploy depois pra valer.

## Dados / regras de negócio

- Supabase projeto "AlyPay": `https://ntjirpqulrnieeglpiei.supabase.co`
  (chave secreta com o usuário / nos secrets do Pages).
- `compras.parcelas = null` → recorrente ("eterno"), `total` = valor mensal.
- `tipo = 'emprestimo'` → servidor força `parcelas = 1`; `prazo` é só
  informativo.
- Valores de fatura de cartão colados pelo usuário são POR PARCELA
  (total = parcela × n), salvo indicação contrária.
- `origem` (`admin`|`primo`) alimenta a aba "🔔 Atividade" do admin.
- `status`: `aprovado` (conta no saldo) | `rejeitado` (contestado pelo admin,
  fica de fora mas não some). Lançamento de primo entra direto como aprovado;
  admin contesta depois. `pendente` existe no schema por compatibilidade, não
  é mais usado.
- Centavos: parcela base = floor(total/n*100)/100, última parcela absorve a
  diferença (`parcelaValor` em index.html).
- "Vencido" no cartão = tudo que já venceu até o mês atual (inclusive) menos
  pagamentos. Dívida antiga já paga por fora → registrar pagamento de acerto
  retroativo com nota.

## Identidade visual

- `assets/logo.png` — mascote flat (cabeça + megafone + moedas), marca no
  cartão. `assets/coin.png` — moeda dourada, bandeira do cartão + favicon.
  `assets/icon.jpg` — avatar detalhado: login admin, mascote da tela do primo,
  header, OG image.
- Cartão de crédito visual: gradiente violeta→azul (tokens `--ap-*` no CSS),
  campos Titular/Válido até, tagline "Cobrança sem stress, só diversão".
- Recorte de imagem (fundo → transparência): flood fill a partir das bordas
  (preserva brancos internos) + manter maior componente conexo. Pillow
  disponível via pip.

## Limitações do ambiente remoto

- Imagem colada no chat NÃO vira arquivo aqui. Fluxo: usuário sobe via GitHub
  web UI (Add file → Upload files no branch) → `git pull` → processar →
  apagar o PNG bruto do repo (são ~5MB cada).
- `localhost` do sandbox não é acessível ao usuário — testar sempre via
  deploy real em produção.
- Sem `gh` CLI; GitHub via MCP tools quando disponíveis.
- Cloudflare Pages não tem cron; se precisar de agendamento, é Worker à parte.

## Convenções

- Não commitar segredos (senha admin, tokens de primo, chaves). Tokens de
  acesso dos primos: buscar via API admin ou painel.
- Depois de mudar visual, verificar produção com `curl` (grep no HTML servido
  ou md5sum de asset) antes de avisar o usuário.
- Commits em inglês, mensagem curta explicando o porquê.
